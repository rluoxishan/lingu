import { loginTpapi, type TpapiAuthConfig } from "./tpapiAuth.js";
import {
  buildTpapiSetTaskPointBody,
  resolveTaskPointXYZW,
} from "../mapper/taskPointDispatch.js";
import type {
  BeidouNavigationRequest,
  CloudConfig,
  CloudVehicleStatus,
  DeviceTaskPointsResult,
  RegisterVehicleInfo,
  TaskPointXYZW,
} from "../models/types.js";

export interface NavigationResult {
  cloudTaskId: string;
  taskId: string;
  acceptedAt: number;
}

interface LinguResponse<T> {
  code: number;
  data: T;
  msg: string;
}

interface LoginData {
  userId: number;
  accessToken: string;
  refreshToken: string;
  expiresTime: number;
}

interface DeviceDetailData {
  workStatus: number;
  inNodeTime?: number;
  nextNodeName?: string;
  nextNodeTime?: number;
  position?: string;
  position_xyz?: string;
  heading?: number;
  battery: number;
  isInNode?: boolean;
  inNodeName?: string;
  taskId?: string;
}

/** tpapi get_device_detail_list 单项 */
interface TpapiDeviceItem {
  id: string;
  name?: string;
  online?: boolean;
  updateTime?: number;
  details?: DeviceDetailData;
  errors?: unknown;
}

interface TaskListItem {
  deviceId: string;
  taskId: string;
  taskName: string;
  active?: boolean;
  executionMode?: string;
}

interface TaskPageData {
  list: TaskListItem[];
  total: number;
}

/** 云平台批量设备项（select_all_device 或等价接口） */
interface CloudDeviceBatchItem {
  id: string;
  name?: string;
  online?: boolean;
  workStatus?: number;
  battery?: number;
  position?: string;
  position_xyz?: string;
  heading?: number;
  taskId?: string;
  taskName?: string;
}

export class CloudClient {
  private accessToken: string | null = null;
  private expiresTime = 0;
  private taskListCache: TaskListItem[] | null = null;
  private taskListCacheAt = 0;
  private readonly taskListCacheTtlMs = 5000;

  constructor(private readonly config: CloudConfig) {}

  /** 注册时批量查云（与定时推送共用逻辑） */
  async fetchVehicleInfosForRegister(vehicleIds: string[]): Promise<RegisterVehicleInfo[]> {
    if (vehicleIds.length === 0) return [];

    const statusMap = await this.fetchVehicleStatuses(vehicleIds);
    return vehicleIds.map((vehicleId) => {
      const status = statusMap.get(vehicleId);
      if (!status) {
        return {
          vehicleId,
          online: false,
          workStatus: 0,
          battery: 0,
          updatedAt: Date.now(),
          error: "device not found in cloud batch response",
        } satisfies RegisterVehicleInfo;
      }
      return toRegisterVehicleInfo(status);
    });
  }

  /** 按 vehicleIds 批量查状态（每轮推送 1～2 次 HTTP） */
  async fetchVehicleStatuses(vehicleIds: string[]): Promise<Map<string, CloudVehicleStatus>> {
    if (vehicleIds.length === 0) return new Map();

    if (this.config.mock) {
      return new Map(vehicleIds.map((id) => [id, mockStatus(id)]));
    }

    await this.ensureToken();

    const result =
      this.config.statusQueryMode === "batch"
        ? await this.fetchStatusesBatch(vehicleIds)
        : await this.fetchStatusesSingle(vehicleIds);

    if (this.config.enrichTaskFromList && !this.isTpapiMode()) {
      await this.enrichStatusesWithTasks(result);
    }

    return result;
  }

  /** @deprecated 保留单查，供 fallback 或外部调用 */
  async getVehicleStatus(vehicleId: string): Promise<CloudVehicleStatus> {
    const map = await this.fetchVehicleStatuses([vehicleId]);
    const status = map.get(vehicleId);
    if (!status) {
      throw new CloudApiError(502, `device not found: ${vehicleId}`);
    }
    return status;
  }

  async dispatchImmediateNavigation(
    request: BeidouNavigationRequest,
  ): Promise<NavigationResult> {
    if (this.config.mock) {
      const taskId = `BD-NAV-${Date.now()}`;
      return {
        taskId,
        cloudTaskId: `mock-${taskId}`,
        acceptedAt: Date.now(),
      };
    }

    await this.ensureToken();

    if (request.taskPoint) {
      if (this.isTpapiMode()) {
        return this.dispatchTpapiSetTaskPoint(
          request.vehicleId,
          buildTpapiSetTaskPointBody(request.vehicleId, { taskPoint: request.taskPoint }),
        );
      }
      return this.dispatchAdminTaskPointStation(request.vehicleId, request.taskPoint);
    }

    const xyzw = resolveTaskPointXYZW(request);
    if (xyzw) {
      if (this.isTpapiMode()) {
        return this.dispatchTpapiSetTaskPoint(
          request.vehicleId,
          buildTpapiSetTaskPointBody(request.vehicleId, { taskPointXYZW: xyzw }),
        );
      }

      const taskId = `BD-NAV-${Date.now()}`;
      const body = buildInstruction2010001Coordinate(request.vehicleId, taskId, xyzw);
      const response = await this.request<LinguResponse<null>>(
        "POST",
        "/device/instructions",
        body,
      );
      if (response.code !== 0) {
        throw new CloudApiError(502, response.msg || "instructions failed");
      }
      return { taskId, cloudTaskId: taskId, acceptedAt: Date.now() };
    }

    throw new CloudApiError(
      400,
      "provide taskPoint (name) or taskPointXYZW / x,y,direction (coordinates)",
    );
  }

  /** tpapi: GET get_device_task_point ?deviceId= */
  async fetchTpapiDeviceTaskPoints(deviceId: string): Promise<DeviceTaskPointsResult> {
    if (this.config.mock) {
      return {
        deviceId,
        raw: [{ taskPoint: "mock-station-a" }, { taskPoint: "mock-station-b" }],
        taskPoints: ["mock-station-a", "mock-station-b"],
      };
    }

    if (!this.isTpapiMode()) {
      throw new CloudApiError(502, "get_device_task_point requires apiMode tpapi");
    }

    await this.ensureToken();

    const path =
      this.config.tpapiGetTaskPointPath ?? "/tpapi/device/get_device_task_point";
    const query = `${path}?deviceId=${encodeURIComponent(deviceId)}`;

    const response = await this.request<LinguResponse<unknown>>("GET", query);

    if (response.code !== 0) {
      throw new CloudApiError(502, response.msg || "get_device_task_point failed");
    }

    return {
      deviceId,
      raw: response.data,
      taskPoints: extractTaskPointNames(response.data),
    };
  }

  /** tpapi: POST set_device_task_point（taskPoint 站名 | taskPointXYZW 坐标，二选一） */
  private async dispatchTpapiSetTaskPoint(
    deviceId: string,
    body: Record<string, unknown>,
  ): Promise<NavigationResult> {
    const path =
      this.config.tpapiSetTaskPointPath ?? "/tpapi/device/set_device_task_point";

    const response = await this.request<LinguResponse<TpapiDeviceItem[]>>(
      "POST",
      path,
      body,
    );

    if (response.code !== 0) {
      throw new CloudApiError(502, response.msg || "set_device_task_point failed");
    }

    const device = response.data?.find((d) => d.id === deviceId);
    const cloudTaskId = device?.details?.taskId ?? `TP-${Date.now()}`;

    return {
      taskId: cloudTaskId,
      cloudTaskId,
      acceptedAt: Date.now(),
    };
  }

  /** admin: 站名模式 2010001（taskNodes[].taskPoint） */
  private async dispatchAdminTaskPointStation(
    deviceId: string,
    taskPoint: string,
  ): Promise<NavigationResult> {
    const taskId = `BD-NAV-${Date.now()}`;
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const body = {
      deviceId,
      type: "2010001",
      data: {
        taskId,
        taskName: "北斗反控-站名",
        active: true,
        cycleCount: "0",
        cycleDays: null,
        cycleType: "EVERY_WEEK",
        executionMode: "IMMEDIATE",
        returnPoint: "",
        startTime,
        taskNodes: [{ order: 1, duration: "00:00", taskPoint }],
      },
    };

    const response = await this.request<LinguResponse<null>>(
      "POST",
      "/device/instructions",
      body,
    );

    if (response.code !== 0) {
      throw new CloudApiError(502, response.msg || "instructions failed");
    }

    return {
      taskId,
      cloudTaskId: taskId,
      acceptedAt: Date.now(),
    };
  }

  /** 一次 POST 按 deviceIdList 批量查（admin 或 tpapi） */
  private async fetchStatusesBatch(
    vehicleIds: string[],
  ): Promise<Map<string, CloudVehicleStatus>> {
    if (this.isTpapiMode()) {
      return this.fetchStatusesTpapiBatch(vehicleIds);
    }

    const response = await this.request<LinguResponse<CloudDeviceBatchItem[]>>(
      "POST",
      this.config.statusBatchPath,
      {},
    );

    if (response.code !== 0 || !Array.isArray(response.data)) {
      throw new CloudApiError(502, response.msg || "batch device query failed");
    }

    const batchById = new Map(response.data.filter((d) => d?.id).map((d) => [d.id, d]));
    const result = new Map<string, CloudVehicleStatus>();

    for (const id of vehicleIds) {
      const item = batchById.get(id);
      if (item && batchItemHasStatusFields(item)) {
        result.set(id, mapBatchItem(item));
        continue;
      }

      try {
        const detail = await this.fetchDeviceDetail(id);
        const status = mapDeviceDetail(id, detail);
        status.online = item?.online ?? true;
        result.set(id, status);
        if (item) {
          console.warn(`[cloud] batch item incomplete for ${id}, used detail fallback`);
        } else {
          console.warn(`[cloud] device ${id} not in batch response, used detail fallback`);
        }
      } catch (error) {
        if (item) {
          result.set(id, mapBatchItem(item));
        } else {
          console.error(`[cloud] device ${id} missing in batch and detail failed`, error);
        }
      }
    }

    return result;
  }

  /** tpapi: POST get_device_detail_list { deviceIdList } */
  private async fetchStatusesTpapiBatch(
    vehicleIds: string[],
  ): Promise<Map<string, CloudVehicleStatus>> {
    const path =
      this.config.tpapiDeviceDetailListPath ??
      this.config.statusBatchPath ??
      "/tpapi/device/get_device_detail_list";

    const response = await this.request<LinguResponse<TpapiDeviceItem[]>>(
      "POST",
      path,
      { deviceIdList: vehicleIds },
    );

    if (response.code !== 0 || !Array.isArray(response.data)) {
      throw new CloudApiError(502, response.msg || "tpapi batch device query failed");
    }

    const result = new Map<string, CloudVehicleStatus>();
    for (const item of response.data) {
      if (!item?.id) continue;
      result.set(item.id, mapTpapiDeviceItem(item));
    }

    for (const id of vehicleIds) {
      if (!result.has(id)) {
        console.warn(`[cloud] tpapi device ${id} not in get_device_detail_list response`);
      }
    }

    return result;
  }

  private async fetchStatusesSingle(
    vehicleIds: string[],
  ): Promise<Map<string, CloudVehicleStatus>> {
    if (this.isTpapiMode()) {
      return this.fetchStatusesTpapiBatch(vehicleIds);
    }

    const onlineMap = await this.fetchOnlineMap();

    const entries = await Promise.all(
      vehicleIds.map(async (vehicleId) => {
        try {
          const detail = await this.fetchDeviceDetail(vehicleId);
          const status = mapDeviceDetail(vehicleId, detail);
          status.online = onlineMap.get(vehicleId) ?? true;
          return [vehicleId, status] as const;
        } catch (error) {
          console.error(`[cloud] detail failed for ${vehicleId}`, error);
          return null;
        }
      }),
    );

    return new Map(entries.filter((e): e is [string, CloudVehicleStatus] => e !== null));
  }

  private async fetchOnlineMap(): Promise<Map<string, boolean>> {
    try {
      const response = await this.request<LinguResponse<CloudDeviceBatchItem[]>>(
        "POST",
        this.config.statusBatchPath,
        {},
      );
      if (response.code !== 0 || !Array.isArray(response.data)) {
        return new Map();
      }
      return new Map(response.data.map((d) => [d.id, d.online ?? false]));
    } catch {
      return new Map();
    }
  }

  private async enrichStatusesWithTasks(statusMap: Map<string, CloudVehicleStatus>): Promise<void> {
    const tasks = await this.fetchAllTasks();
    for (const status of statusMap.values()) {
      if (status.taskId || status.taskName) continue;
      const task = tasks.find(
        (t) => t.deviceId === status.vehicleId && t.active !== false,
      );
      if (task) {
        status.taskId = task.taskId;
        status.taskName = task.taskName;
      }
    }
  }

  private async fetchAllTasks(): Promise<TaskListItem[]> {
    const now = Date.now();
    if (this.taskListCache && now - this.taskListCacheAt < this.taskListCacheTtlMs) {
      return this.taskListCache;
    }

    const response = await this.request<LinguResponse<TaskPageData>>(
      "POST",
      "/device/select_task_by_page",
      { pageNo: 1, pageSize: 200 },
    );

    if (response.code !== 0 || !response.data?.list) {
      return [];
    }

    this.taskListCache = response.data.list;
    this.taskListCacheAt = now;
    return this.taskListCache;
  }

  private async fetchDeviceDetail(deviceId: string): Promise<DeviceDetailData> {
    const response = await this.request<LinguResponse<DeviceDetailData>>(
      "GET",
      `/device/select_device_detail_by_id?id=${encodeURIComponent(deviceId)}`,
    );

    if (response.code !== 0 || !response.data) {
      throw new CloudApiError(502, response.msg || `device detail failed: ${deviceId}`);
    }

    return response.data;
  }

  private async ensureToken(): Promise<void> {
    const now = Date.now();
    if (this.accessToken && now < this.expiresTime - 60_000) {
      return;
    }
    await this.login();
  }

  private async login(): Promise<void> {
    const { auth } = this.config;

    if (auth.type === "tpapi_login") {
      await this.loginTpapi();
      return;
    }

    const url = `${this.config.baseUrl}${auth.loginPath ?? "/system/auth/login"}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "tenant-id": this.config.tenantId,
      },
      body: JSON.stringify({
        tenantName: auth.tenantName,
        username: auth.username,
        password: auth.password,
        rememberMe: true,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) {
      throw new CloudApiError(response.status, "login HTTP failed");
    }

    const body = (await response.json()) as LinguResponse<LoginData>;
    if (body.code !== 0 || !body.data?.accessToken) {
      throw new CloudApiError(401, body.msg || "login rejected");
    }

    this.accessToken = body.data.accessToken;
    this.expiresTime = body.data.expiresTime ?? nowPlusHours(12);
  }

  private async loginTpapi(): Promise<void> {
    const { auth } = this.config;
    const tpapiConfig: TpapiAuthConfig = {
      tpapiBaseUrl: auth.tpapiBaseUrl ?? "https://sztu.lingubot.cn/third-party-api",
      publicKeyPath: auth.publicKeyPath ?? "/tpapi/auth/public_key",
      publicKeyId: auth.publicKeyId ?? auth.username,
      loginPath: auth.tpapiLoginPath ?? "/tpapi/auth/login",
      username: auth.username,
      password: auth.password,
      timeoutMs: this.config.timeoutMs,
    };

    if (!tpapiConfig.publicKeyId) {
      throw new CloudApiError(500, "tpapi_login: missing publicKeyId or username");
    }

    try {
      const result = await loginTpapi(tpapiConfig);
      this.accessToken = result.accessToken;
      this.expiresTime = result.expiresTime;
    } catch (error) {
      const message = error instanceof Error ? error.message : "tpapi login failed";
      throw new CloudApiError(401, message);
    }
  }

  private isTpapiMode(): boolean {
    return this.config.apiMode === "tpapi" || this.config.auth.type === "tpapi_login";
  }

  private getApiBaseUrl(): string {
    if (this.isTpapiMode()) {
      return (
        this.config.auth.tpapiBaseUrl ??
        this.config.baseUrl ??
        "https://sztu.lingubot.cn/third-party-api"
      );
    }
    return this.config.baseUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (!this.isTpapiMode()) {
      headers["tenant-id"] = this.config.tenantId;
    }

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    };

    if (body !== undefined && method !== "GET") {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.getApiBaseUrl()}${path}`, init);

    if (response.status === 401) {
      this.accessToken = null;
      throw new CloudApiError(401, "unauthorized");
    }

    if (!response.ok) {
      throw new CloudApiError(response.status, await response.text());
    }

    return (await response.json()) as T;
  }
}

export class CloudApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "CloudApiError";
  }
}

function batchItemHasStatusFields(item: CloudDeviceBatchItem): boolean {
  return item.workStatus !== undefined && item.battery !== undefined;
}

function mapBatchItem(item: CloudDeviceBatchItem): CloudVehicleStatus {
  const status: CloudVehicleStatus = {
    vehicleId: item.id,
    clientId: item.id,
    online: item.online ?? false,
    updatedAt: Date.now(),
    workStatus: item.workStatus ?? 0,
    battery: item.battery ?? 0,
    taskId: item.taskId,
    taskName: item.taskName,
    heading: item.heading,
  };

  if (item.position) {
    const parts = item.position.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      status.positionLonLat = { lon: parts[0], lat: parts[1] };
    }
  }

  if (item.position_xyz) {
    const parts = item.position_xyz.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      status.positionXyz = {
        x: parts[0],
        y: parts[1],
        yaw: parts[2] ?? 0,
      };
    }
  }

  return status;
}

function mapDeviceDetail(deviceId: string, detail: DeviceDetailData): CloudVehicleStatus {
  const status: CloudVehicleStatus = {
    vehicleId: deviceId,
    clientId: deviceId,
    online: true,
    updatedAt: Date.now(),
    workStatus: detail.workStatus ?? 0,
    battery: detail.battery ?? 0,
    heading: detail.heading,
    taskId: detail.taskId,
  };

  if (detail.position) {
    const parts = detail.position.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      status.positionLonLat = { lon: parts[0], lat: parts[1] };
    }
  }

  if (detail.position_xyz) {
    const parts = detail.position_xyz.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      status.positionXyz = {
        x: parts[0],
        y: parts[1],
        yaw: parts[2] ?? 0,
      };
    }
  }

  return status;
}

function mapTpapiDeviceItem(item: TpapiDeviceItem): CloudVehicleStatus {
  const detail = item.details ?? { workStatus: 0, battery: 0 };
  const status = mapDeviceDetail(item.id, detail);
  status.online = item.online ?? false;
  status.updatedAt = item.updateTime ?? Date.now();

  const fault = mapTpapiErrors(item.errors);
  status.faultSummary = fault.faultSummary;
  status.alertMsg = fault.alertMsg;

  return status;
}

function mapTpapiErrors(errors: unknown): {
  faultSummary: CloudVehicleStatus["faultSummary"];
  alertMsg: string;
} {
  if (errors == null) {
    return { faultSummary: { hasFault: false }, alertMsg: "" };
  }

  const hasFault = Array.isArray(errors)
    ? errors.length > 0
    : typeof errors === "object"
      ? Object.keys(errors as object).length > 0
      : Boolean(errors);

  return {
    faultSummary: {
      hasFault,
      faultCount: Array.isArray(errors) ? errors.length : undefined,
    },
    alertMsg: hasFault ? JSON.stringify(errors).slice(0, 500) : "",
  };
}

function buildInstruction2010001Coordinate(
  deviceId: string,
  taskId: string,
  xyzw: TaskPointXYZW,
): {
  deviceId: string;
  type: string;
  data: Record<string, unknown>;
} {
  const now = new Date();
  const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    deviceId,
    type: "2010001",
    data: {
      taskId,
      taskName: "北斗反控导航",
      active: true,
      cycleCount: "0",
      cycleDays: null,
      cycleType: "EVERY_WEEK",
      executionMode: "IMMEDIATE",
      returnPoint: "",
      startTime,
      taskNodes: [
        {
          order: 1,
          duration: "00:00",
          taskPoint: "",
          x: xyzw.x,
          y: xyzw.y,
          z: xyzw.z,
          w: xyzw.w,
        },
      ],
    },
  };
}

function nowPlusHours(hours: number): number {
  return Date.now() + hours * 3600 * 1000;
}

function toRegisterVehicleInfo(status: CloudVehicleStatus): RegisterVehicleInfo {
  const position = status.positionLonLat
    ? { x: status.positionLonLat.lon, y: status.positionLonLat.lat }
    : status.positionXyz
      ? { x: status.positionXyz.x, y: status.positionXyz.y }
      : undefined;

  return {
    vehicleId: status.vehicleId,
    online: status.online,
    workStatus: status.workStatus,
    battery: status.battery,
    position,
    taskId: status.taskId,
    taskName: status.taskName,
    updatedAt: status.updatedAt,
  };
}

function mockStatus(vehicleId: string): CloudVehicleStatus {
  const t = Date.now();
  return {
    vehicleId,
    clientId: vehicleId,
    online: true,
    updatedAt: t,
    positionLonLat: { lon: 114.398441, lat: 22.702372 },
    heading: 0,
    workStatus: 1,
    battery: 85,
    taskId: "T001",
    taskName: "mock-task",
    faultSummary: { hasFault: false, faultCount: 0, highestFaultLevel: 1 },
    alertMsg: "",
  };
}

/** 从 get_device_task_point 响应尽力解析站点名列表（字段以云平台最终文档为准） */
function extractTaskPointNames(data: unknown): string[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    if (data.every((x) => typeof x === "string")) {
      return data as string[];
    }
    const names: string[] = [];
    for (const item of data) {
      if (typeof item === "string") {
        names.push(item);
        continue;
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        for (const key of ["taskPoint", "name", "pointName", "stationName", "nodeName"]) {
          const v = o[key];
          if (typeof v === "string" && v.length > 0) {
            names.push(v);
            break;
          }
        }
      }
    }
    return [...new Set(names)];
  }

  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["taskPoints", "taskPointList", "points", "list"]) {
      const nested = o[key];
      if (Array.isArray(nested)) {
        return extractTaskPointNames(nested);
      }
    }
  }

  return [];
}
