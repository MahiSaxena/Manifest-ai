"use client";

import { useState } from "react";
import { login } from "@/lib/api";
import type { User } from "@/lib/types";

export default function LoginScreen({
    onLogin,
}: {
    onLogin: (user: User) => void;
}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError("Please enter both username and password");
            return;
        }
        setError("");
        setLoading(true);
        try{
            const user = await login(username.trim(), password);
            onLogin(user);
        } catch (err: any) {
            if (err.response?.status == 429) {
                setError(err.response.data.detail);
            } else{
                setError("Invalid username or password");
            }
        }   finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f0f2f5",
        }}>
            <div style={{
                display: "flex",
                width: "100%",
                maxWidth: 900,
                minHeight: 520,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
            }}>
                {/* left panel */}
                <div style={{
                    width: "42%",
                    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                    padding: "48px 40px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    color: "white",
                }}>
                    <div>
                        <div style={{
                            fontSize: 28,
                            fontWeight: 700,
                            letterSpacing: "-0.5px",
                            marginBottom: 8,
                        }}>
                            Manifest
                        </div>
                        <div style={{
                            fontSize: 13,
                            opacity: 0.7,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                        }}>
                            Document Intelligence 
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: 22,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            marginBottom: 24,
                        }}>
                            Ask anything from your company documents
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12}}>
                            {[
                                "Fully offline - no data leaves your network",
                                "Per-user document privacy built in",
                                "Supports PDF, DOCX, PPTX, scanned files",
                            ].map((item) => (
                                <div key={item} style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 10,
                                    fontSize: 13,
                                    opacity: 0.9,
                                }}>
                                    <span style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: "50%",
                                        background: "rgba(255,255,255,0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        fontSize: 10,
                                        marginTop: 1,
                                    }}>v</span>
                                    {item}
                                </div>

                            ))}
                        </div>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.5}}>
                        © 2026 Manifest. Internal use only.
                    </div>
                </div>
                {/* Right panel */ }
                <div style={{
                    flex: 1,
                    background: "white",
                    padding: "48px 40px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                }}>
                    <h2 style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: 6,
                    }}>
                        Welcome Back 
                    </h2>
                    <p style={{
                        fontSize: 14,
                        color: "#6b7280",
                        marginBottom: 32,
                    }}>
                        Sign in
                    </p>

                    <form onSubmit={handleSubmit} style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 18,
                    }}>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 6,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                            }}>
                                Username 
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    border: "1.5px solid #e5e7eb",
                                    borderRadius: 8,
                                    fontSize: 14,
                                    outline: "none",
                                    transition: "border-color 0.2s",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 6,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase"
                            }}>
                                Password
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    style={{
                                        width: "100%",
                                        padding: "10px 40px 10px 14px",
                                        border: "1.5px solid #e5e7eb",
                                        borderRadius: 8,
                                        fontSize: 14,
                                        outline: "none",
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute",
                                        right: 12,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#9ca3af",
                                        fontSize: 16,
                                    }}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: 8,
                                fontSize: 13,
                                color: "#dc2626"
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "12px",
                                background: loading ? "#93c5fd" : "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                fontSize: 15,
                                fontWeight: 600,
                                cursor: loading ? "not-allowed" : "pointer",
                                transition: "background 0.2s",
                                marginTop: 4,
                            }}
                        >
                            {loading ? "Signing in..." : "Sign in ->"}
                        </button>
                    </form>

                    <p style={{
                        marginTop: 24,
                        fontSize: 12,
                        color: "#9ca3af",
                        textAlign: "center",
                        lineHeight: 1.6,
                    }}>
                        Access is restricted to authorized employees only.
                    </p>
                </div>
            </div>
        </div>   
    );
}