import { createClient } from '@/lib/supabase-server';

const MANUS_API_KEY = process.env.MANUS_API_KEY || '';
const MANUS_BASE_URL = 'https://api.manus.ai/v1';

export async function uploadFileToManus(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch source image: ${res.statusText}`);
    const blob = await res.blob();

    const formData = new FormData();
    formData.append('file', blob, 'food.jpg');

    const manusRes = await fetch(`${MANUS_BASE_URL}/files`, {
        method: 'POST',
        headers: {
            'X-API-Key': MANUS_API_KEY,
        },
        body: formData,
    });

    if (!manusRes.ok) {
        const err = await manusRes.text();
        throw new Error(`Manus file upload failed: ${err}`);
    }

    const data = await manusRes.json();
    return data.id;
}

export async function createManusTask(params: {
    prompt: string;
    fileId?: string;
}): Promise<string> {
    const body: any = {
        prompt: params.prompt,
        agentProfile: 'speed',
        taskMode: 'agent',
    };

    if (params.fileId) {
        body.fileIds = [params.fileId];
    }

    const res = await fetch(`${MANUS_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
            'X-API-Key': MANUS_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Manus task creation failed: ${err}`);
    }

    const data = await res.json();
    return data.id;
}

export async function getManusTaskStatus(taskId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    resultUrl?: string;
    error?: string;
}> {
    const res = await fetch(`${MANUS_BASE_URL}/tasks/${taskId}`, {
        headers: {
            'X-API-Key': MANUS_API_KEY,
        },
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Manus status check failed: ${err}`);
    }

    const data = await res.json();
    
    // Based on Manus API, results might be in an array of files/outputs
    let resultUrl = undefined;
    if (data.status === 'completed' && data.output && data.output.files) {
        const imageFile = data.output.files.find((f: any) => f.type === 'image' || f.url?.match(/\.(jpg|jpeg|png)$/i));
        resultUrl = imageFile?.url;
    }

    return {
        status: data.status,
        resultUrl,
        error: data.error_message,
    };
}
