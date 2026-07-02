import type { CloudVehicleStatus, TaskPointXYZW } from "../models/types.js";

/** 1010001 MQTT 信封 */
export interface Mqtt1010001Envelope {
  id?: number;
  time?: number;
  type?: string;
  data?: Record<string, unknown>;
}

export function parse1010001Payload(raw: string): CloudVehicleStatus | null {
  let envelope: Mqtt1010001Envelope;
  try {
    envelope = JSON.parse(raw) as Mqtt1010001Envelope;
  } catch {
    return null;
  }

  if (envelope.type !== "1010001" || !envelope.data) return null;

  const data = envelope.data;
  const clientId = typeof data.clientId === "string" ? data.clientId : "";
  const vehicleId = clientId;

  const positionStr = typeof data.position === "string" ? data.position : undefined;
  const positionXyzStr =
    typeof data.position_xyz === "string"
      ? data.position_xyz
      : typeof data.positionXyz === "string"
        ? data.positionXyz
        : undefined;

  let positionLonLat: CloudVehicleStatus["positionLonLat"];
  let positionXyz: CloudVehicleStatus["positionXyz"];

  if (positionXyzStr) {
    const parts = positionXyzStr.split(",").map((s) => Number(s.trim()));
    if (parts.length >= 2 && parts.every((n) => !Number.isNaN(n))) {
      positionXyz = { x: parts[0], y: parts[1], yaw: parts[2] ?? 0 };
    }
  }

  if (positionStr) {
    const parts = positionStr.split(",").map((s) => Number(s.trim()));
    if (parts.length >= 2 && parts.every((n) => !Number.isNaN(n))) {
      positionLonLat = { lon: parts[0], lat: parts[1] };
    }
  }

  const faultSummary = parseFaultSummary(data.faultSummary ?? data.errors);
  const workStatus = typeof data.workStatus === "number" ? data.workStatus : 0;
  const battery = typeof data.battery === "number" ? data.battery : 0;
  const heading = typeof data.heading === "number" ? data.heading : undefined;
  const taskId = typeof data.taskId === "string" ? data.taskId : undefined;
  const taskName = typeof data.taskName === "string" ? data.taskName : undefined;

  return {
    vehicleId,
    clientId: clientId || vehicleId,
    online: true,
    updatedAt: envelope.time ?? Date.now(),
    positionXyz,
    positionLonLat,
    heading,
    workStatus,
    battery,
    taskId,
    taskName,
    faultSummary,
    alertMsg: faultSummary?.hasFault ? JSON.stringify(data.errors ?? data.faultSummary).slice(0, 500) : "",
  };
}

function parseFaultSummary(value: unknown): CloudVehicleStatus["faultSummary"] {
  if (!value) return { hasFault: false };
  if (typeof value === "object" && value !== null && "hasFault" in value) {
    const obj = value as { hasFault?: boolean; faultCount?: number; highestLevel?: number };
    return {
      hasFault: Boolean(obj.hasFault),
      faultCount: obj.faultCount,
      highestFaultLevel: obj.highestLevel,
    };
  }
  if (Array.isArray(value) && value.length > 0) {
    return { hasFault: true, faultCount: value.length };
  }
  return { hasFault: false };
}

export function build2010001CoordinateMessage(
  taskId: string,
  xyzw: TaskPointXYZW,
): { id: number; time: number; type: string; data: Record<string, unknown> } {
  const now = new Date();
  const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    id: Date.now(),
    time: Date.now(),
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

export function build2010001TaskPointMessage(
  taskId: string,
  taskPoint: string,
): { id: number; time: number; type: string; data: Record<string, unknown> } {
  const now = new Date();
  const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    id: Date.now(),
    time: Date.now(),
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
      taskNodes: [{ order: 1, duration: "00:00", taskPoint }],
    },
  };
}

export function topicFromPattern(pattern: string, clientId: string): string {
  return pattern.replace("{clientId}", clientId);
}

/** 从 topic dev/pub/LU2606000100 解析 clientId */
export function clientIdFromPubTopic(topic: string): string | null {
  const match = topic.match(/^dev\/pub\/(.+)$/);
  return match?.[1] ?? null;
}
