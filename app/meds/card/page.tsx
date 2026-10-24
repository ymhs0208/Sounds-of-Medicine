import { Suspense } from "react";
import MedicineCardClient from "./card-client";

export default function MedicineCardPage() {
  return (
    <Suspense fallback={null}>
      <MedicineCardClient />
    </Suspense>
  );
}
