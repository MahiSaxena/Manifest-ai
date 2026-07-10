"use client";

import { useState, useRef, useEffect } from "react";
import type { User, DocFile, ChatMessage } from "@/lib/types";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  sendMessage,
  logout,
} from "@/lib/api";

export default function AppShell({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [view, setView] = useState<"chat" | "documents">("chat");
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [visibility, setVisibility] = useState<"private" | "shared">("private");
  const [dragging, setDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadDocuments() {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error("Failed to load documents");
    }
  }

  async function handleSend() {
    if (!question.trim() || sending) return;
    const q = question.trim();
    setQuestion("");
    setSending(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: q,
    };

    const pendingMsg: ChatMessage = {
      id: Date.now().toString() + "_pending",
      role: "assistant",
      text: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);

    try {
      const result = await sendMessage(q);
      setMessages((prev) =>
        prev.map((m) =>
          m.pending
            ? {
                ...m,
                text: result.answer,
                sources: result.sources,
                pending: false,
              }
            : m
        )
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.pending
            ? {
                ...m,
                text: "Something went wrong. Please try again.",
                pending: false,
              }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    try {
      const result = await uploadDocument(file, visibility);
      setUploadStatus(`✓ ${file.name} indexed (${result.chunks_indexed} chunks)`);
      await loadDocuments();
      setTimeout(() => setUploadStatus(""), 3000);
    } catch (e) {
      setUploadStatus(`✗ Failed to upload ${file.name}`);
      setTimeout(() => setUploadStatus(""), 3000);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error("Delete failed");
    }
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getFileIcon(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (ext === "docx" || ext === "doc") return "📝";
    if (ext === "pptx" || ext === "ppt") return "📊";
    if (ext === "xlsx" || ext === "xls") return "📈";
    if (["png", "jpg", "jpeg"].includes(ext || "")) return "🖼️";
    return "📁";
  }

  const privateDocs = documents.filter((d) => d.visibility === "private");
  const sharedDocs = documents.filter((d) => d.visibility === "shared");

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f0f2f5" }}>

      {/* Sidebar */}
      <div style={{
        width: 240,
        background: "white",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #f3f4f6",
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#1e3a8a",
            letterSpacing: "-0.5px",
          }}>
            Manifest
          </div>
          <div style={{
            fontSize: 11,
            color: "#9ca3af",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginTop: 2,
          }}>
            Document Intelligence
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "12px 12px", flex: 1 }}>
          {[
            { id: "chat", label: "Ask Documents", icon: "💬" },
            { id: "documents", label: "My Library", icon: "📚" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as "chat" | "documents")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: view === item.id ? 600 : 400,
                background: view === item.id ? "#eff6ff" : "transparent",
                color: view === item.id ? "#2563eb" : "#4b5563",
                marginBottom: 4,
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Document count */}
          <div style={{
            marginTop: 16,
            padding: "12px",
            background: "#f9fafb",
            borderRadius: 8,
            fontSize: 12,
            color: "#6b7280",
          }}>
            <div style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Library
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span>Private</span>
              <span style={{ fontWeight: 600, color: "#1f2937" }}>{privateDocs.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Shared</span>
              <span style={{ fontWeight: 600, color: "#1f2937" }}>{sharedDocs.length}</span>
            </div>
          </div>
        </div>

        {/* User section */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid #f3f4f6",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user.username}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                {user.is_admin ? "Admin" : "Member"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "7px",
              background: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 12,
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* CHAT VIEW */}
        {view === "chat" && (
          <div style={{ display: "flex", height: "100%", gap: 0 }}>
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}>
              {/* Header */}
              <div style={{
                padding: "16px 24px",
                background: "white",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
                    Ask your documents
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    Answers come only from documents you can access
                  </div>
                </div>
                <div style={{
                  fontSize: 12,
                  color: "#6b7280",
                  background: "#f3f4f6",
                  padding: "4px 10px",
                  borderRadius: 20,
                }}>
                  {documents.length} docs available
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                {messages.length === 0 && (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 16,
                  }}>
                    <div style={{ fontSize: 40 }}>💬</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
                      Ask anything about your documents
                    </div>
                    <div style={{ fontSize: 14, color: "#9ca3af", textAlign: "center" }}>
                      Upload documents in My Library, then ask questions here
                    </div>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: "100%",
                      maxWidth: 400,
                      marginTop: 8,
                    }}>
                      {[
                        "Summarize the latest SOP",
                        "What is the process for handling complaints?",
                        "Find key points in the uploaded document",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setQuestion(suggestion)}
                          style={{
                            padding: "10px 16px",
                            background: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            fontSize: 13,
                            color: "#374151",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={{
                      maxWidth: "75%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}>
                      <div style={{
                        padding: "12px 16px",
                        borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: msg.role === "user" ? "#2563eb" : "white",
                        color: msg.role === "user" ? "white" : "#111827",
                        fontSize: 14,
                        lineHeight: 1.6,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        border: msg.role === "assistant" ? "1px solid #f3f4f6" : "none",
                      }}>
                        {msg.pending ? (
                          <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
                            {[0, 1, 2].map((i) => (
                              <div key={i} style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#9ca3af",
                                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                              }} />
                            ))}
                          </div>
                        ) : (
                          <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
                        )}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {msg.sources.map((source) => (
                            <span key={source} style={{
                              fontSize: 11,
                              color: "#6b7280",
                              background: "#f3f4f6",
                              padding: "2px 8px",
                              borderRadius: 10,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}>
                              📄 {source}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: "16px 24px",
                background: "white",
                borderTop: "1px solid #e5e7eb",
              }}>
                <div style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-end",
                  background: "#f9fafb",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "8px 8px 8px 16px",
                }}>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask a question about your documents..."
                    rows={1}
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      resize: "none",
                      fontSize: 14,
                      color: "#111827",
                      outline: "none",
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!question.trim() || sending}
                    style={{
                      padding: "8px 16px",
                      background: !question.trim() || sending ? "#e5e7eb" : "#2563eb",
                      color: !question.trim() || sending ? "#9ca3af" : "white",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: !question.trim() || sending ? "not-allowed" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {sending ? "..." : "Ask"}
                  </button>
                </div>
                <div style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  textAlign: "center",
                  marginTop: 8,
                }}>
                  Press Enter to send · Shift+Enter for new line · Answers from your documents only
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS VIEW */}
        {view === "documents" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                Document Library
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
                Upload and manage your documents
              </div>

              {/* Upload area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? "#2563eb" : "#d1d5db"}`,
                  borderRadius: 12,
                  padding: "32px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragging ? "#eff6ff" : "white",
                  transition: "all 0.2s",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  Click to upload or drag and drop
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  PDF, DOCX, PPTX, TXT, XLSX, PNG, JPG
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.xlsx,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Visibility toggle */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                padding: "12px 16px",
                background: "white",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                  Upload as:
                </span>
                {(["private", "shared"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 20,
                      border: "1.5px solid",
                      borderColor: visibility === v ? "#2563eb" : "#e5e7eb",
                      background: visibility === v ? "#eff6ff" : "white",
                      color: visibility === v ? "#2563eb" : "#6b7280",
                      fontSize: 12,
                      fontWeight: visibility === v ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {v === "private" ? "🔒 Only me" : "🌐 Everyone"}
                  </button>
                ))}
              </div>

              {/* Upload status */}
              {uploadStatus && (
                <div style={{
                  padding: "10px 16px",
                  background: uploadStatus.startsWith("✓") ? "#f0fdf4" : uploadStatus.startsWith("✗") ? "#fef2f2" : "#eff6ff",
                  border: `1px solid ${uploadStatus.startsWith("✓") ? "#bbf7d0" : uploadStatus.startsWith("✗") ? "#fecaca" : "#bfdbfe"}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: uploadStatus.startsWith("✓") ? "#16a34a" : uploadStatus.startsWith("✗") ? "#dc2626" : "#2563eb",
                  marginBottom: 16,
                }}>
                  {uploading && "⏳ "}{uploadStatus}
                </div>
              )}

              {/* Private documents */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  🔒 Private documents
                  <span style={{
                    background: "#f3f4f6",
                    color: "#6b7280",
                    fontSize: 11,
                    padding: "1px 7px",
                    borderRadius: 10,
                  }}>
                    {privateDocs.length}
                  </span>
                </div>
                {privateDocs.length === 0 ? (
                  <div style={{
                    padding: "20px",
                    background: "white",
                    borderRadius: 8,
                    border: "1px solid #f3f4f6",
                    fontSize: 13,
                    color: "#9ca3af",
                    textAlign: "center",
                  }}>
                    No private documents yet
                  </div>
                ) : (
                  <div style={{
                    background: "white",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                  }}>
                    {privateDocs.map((doc, i) => (
                      <div key={doc.id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom: i < privateDocs.length - 1 ? "1px solid #f3f4f6" : "none",
                      }}>
                        <span style={{ fontSize: 20 }}>{getFileIcon(doc.filename)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {doc.filename}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            {formatBytes(doc.size_bytes)} · {doc.chunk_count} chunks · {formatDate(doc.uploaded_at)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          style={{
                            padding: "4px 10px",
                            background: "transparent",
                            border: "1px solid #fecaca",
                            borderRadius: 6,
                            fontSize: 11,
                            color: "#dc2626",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared documents */}
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  🌐 Shared with everyone
                  <span style={{
                    background: "#f3f4f6",
                    color: "#6b7280",
                    fontSize: 11,
                    padding: "1px 7px",
                    borderRadius: 10,
                  }}>
                    {sharedDocs.length}
                  </span>
                </div>
                {sharedDocs.length === 0 ? (
                  <div style={{
                    padding: "20px",
                    background: "white",
                    borderRadius: 8,
                    border: "1px solid #f3f4f6",
                    fontSize: 13,
                    color: "#9ca3af",
                    textAlign: "center",
                  }}>
                    No shared documents yet
                  </div>
                ) : (
                  <div style={{
                    background: "white",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                  }}>
                    {sharedDocs.map((doc, i) => (
                      <div key={doc.id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom: i < sharedDocs.length - 1 ? "1px solid #f3f4f6" : "none",
                      }}>
                        <span style={{ fontSize: 20 }}>{getFileIcon(doc.filename)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {doc.filename}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            {formatBytes(doc.size_bytes)} · {doc.chunk_count} chunks · {formatDate(doc.uploaded_at)} · by {doc.owner_name}
                          </div>
                        </div>
                        {doc.owner_id === (user as any).id && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            style={{
                              padding: "4px 10px",
                              background: "transparent",
                              border: "1px solid #fecaca",
                              borderRadius: 6,
                              fontSize: 11,
                              color: "#dc2626",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
