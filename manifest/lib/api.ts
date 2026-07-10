import axios from "axios";
import type {DocFile, User, ChatMessage} from "./types"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const api = axios.create(
    {
        baseURL: BASE_URL,
        withCredentials: true,
    }
)

export async function login(username: string, password: string): Promise<User> {
    const res = await api.post("/api/auth/login", {username , password});
    return res.data;
}

export async function logout(): Promise<void> {
    await api.post("/api/auth/logout");
}
export async function getMe(): Promise<User> {
    const res = await api.get("/api/auth/me");
    return res.data;
}

export async function getDocuments(): Promise<DocFile[]> {
    const res = await api.get("/api/documents");
    return res.data;
}

export async function uploadDocument(
    file: File,
    visibility: string
): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", visibility);
    const res = await api.post("/api/upload", formData);
    return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
    await api.delete(`/api/documents/${id}`);
}

export async function sendMessage(question: string): Promise<{
    answer: string;
    sources: string[];
}> {
    const res = await api.post("/api/chat", { question }, {timeout: 120000});
    return res.data;
}