import type { CertificateTemplate } from "../template";
import { APH_ATTENDANCE_TEMPLATE } from "./aph-attendance";

export const BUILTIN_TEMPLATES: CertificateTemplate[] = [APH_ATTENDANCE_TEMPLATE];

export function getBuiltinTemplate(id: string): CertificateTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export { APH_ATTENDANCE_TEMPLATE };
