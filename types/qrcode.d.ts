declare module "qrcode" {
  type QrOptions = {
    margin?: number;
    width?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  };
  export function toDataURL(text: string, options?: QrOptions): Promise<string>;
  const qrcode: { toDataURL: typeof toDataURL };
  export default qrcode;
}
