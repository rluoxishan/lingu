import type { BeidouNavigationRequest, TaskPointXYZW } from "../models/types.js";

/** 航向角（度）→ 2010001 / taskPointXYZW 四元数 z、w（绕 Z 轴半角） */
export function headingDegreesToQuaternionZW(directionDeg: number): Pick<TaskPointXYZW, "z" | "w"> {
  const half = (directionDeg * Math.PI) / 180 / 2;
  return { z: Math.sin(half), w: Math.cos(half) };
}

/** 从 navigation 请求解析坐标模式 taskPointXYZW（北斗 x/y + direction → z/w） */
export function resolveTaskPointXYZW(body: BeidouNavigationRequest): TaskPointXYZW | undefined {
  if (body.taskPointXYZW) {
    const { x, y, z, w } = body.taskPointXYZW;
    if ([x, y, z, w].every((v) => v !== undefined)) {
      return { x: x!, y: y!, z: z!, w: w! };
    }
  }

  if (
    body.x !== undefined &&
    body.y !== undefined &&
    body.direction !== undefined
  ) {
    const zw = headingDegreesToQuaternionZW(body.direction);
    return { x: body.x, y: body.y, z: zw.z, w: zw.w };
  }

  return undefined;
}

/** tpapi set_device_task_point Body：站名与坐标二选一，另一项为空 */
export function buildTpapiSetTaskPointBody(
  deviceId: string,
  mode: { taskPoint: string } | { taskPointXYZW: TaskPointXYZW },
): Record<string, unknown> {
  if ("taskPoint" in mode) {
    return {
      deviceId,
      taskPoint: mode.taskPoint,
      taskPointXYZW: null,
    };
  }
  return {
    deviceId,
    taskPoint: "",
    taskPointXYZW: mode.taskPointXYZW,
  };
}
