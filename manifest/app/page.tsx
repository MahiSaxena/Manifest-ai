"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";
import type { User } from "@/lib/types";
import LoginScreen from "@/components/LoginScreen";
import AppShell from "@/components/AppShell";

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [checking, setChecking] = useState(true);


    useEffect(() => {
        getMe()
            .then((u) => setUser(u))
            .catch(() => setUser(null))
            .finally(() => setChecking(false));
    }, []);
    
    if (checking) {
        return (
            <div
                style={{
                    height: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f0f2f5",
                }}
            >
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        border: "3px solid #2563eb",
                        animation: "spin 0.8s linear infinite",
                    }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!user) {
        return <LoginScreen onLogin={setUser} />;
    }

    return <AppShell user={user} onLogout={() => setUser(null)} />;
}