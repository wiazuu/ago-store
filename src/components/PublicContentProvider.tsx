/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicAdminData } from "@/store/admin-store";

const InitialPublicContentContext = createContext<PublicAdminData | null>(null);

export function PublicContentProvider({
  data,
  children,
}: {
  data: PublicAdminData | null;
  children: ReactNode;
}) {
  return (
    <InitialPublicContentContext.Provider value={data}>
      {children}
    </InitialPublicContentContext.Provider>
  );
}

export function useInitialPublicContent() {
  const data = useContext(InitialPublicContentContext);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  return hydrated ? null : data;
}
