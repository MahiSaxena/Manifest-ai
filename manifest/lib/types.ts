export type Visibility = "private" | "shared";
export interface User{
    username: string;
    is_admin: boolean;
}

export interface DocFile{
    id: string;
    filename: string;
    visibility: Visibility;
    owner_id: number;
    owner_name: string;
    size_bytes: number;
    chunk_count: number;
    status: string;
    uploaded_at: string;
}

export interface ChatMessage{
    id: string;
    role: "user" | "assistant";
    text: string;
    sources?: string[];
    pending?: boolean;
}