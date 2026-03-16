import { createClient } from '@/lib/supabase-server';

const MANUS_API_KEY = process.env.MANUS_API_KEY as string;
const MANUS_BASE_URL = 'https://api.manus.ai/v1';

console.log('[MANUS_INIT] API Key exists:', !!MANUS_API_KEY);
if (!MANUS_API_KEY) {
    console.error('[MANUS_CRITICAL] MANUS_API_KEY is missing from environment variables!');
}

export async function uploadFileToManus(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch source image: ${res.statusText}`);
    const blob = await res.blob();

    const formData = new FormData();
    formData.append('file', blob, 'food.jpg');

    console.log(`[MANUS_FILE_UPLOAD] Initiating upload to ${MANUS_BASE_URL}/files`);
    
    const manusRes = await fetch(`${MANUS_BASE_URL}/files`, {
        method: 'POST',
        headers: {
            'X-API-Key': MANUS_API_KEY,
        },
        body: formData,
    });

    console.log(`[MANUS_FILE_UPLOAD] Response status: ${manusRes.status} ${manusRes.statusText}`);
    const resText = await manusRes.text();
    console.log(`[MANUS_FILE_UPLOAD] Response body: ${resText}`);

    if (!manusRes.ok) {
        throw new Error(`Manus file upload failed (${manusRes.status}): ${resText}`);
    }

    const data = JSON.parse(resText);
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

    console.log(`[MANUS_TASK_CREATE] Request body:`, JSON.stringify(body, null, 2));

    const res = await fetch(`${MANUS_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
            'X-API-Key': MANUS_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    console.log(`[MANUS_TASK_CREATE] Response status: ${res.status} ${res.statusText}`);
    const resText = await res.text();
    console.log(`[MANUS_TASK_CREATE] Response body: ${resText}`);

    if (!res.ok) {
        throw new Error(`Manus task creation failed (${res.status}): ${resText}`);
    }

    const data = JSON.parse(resText);
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
    console.log(`[MANUS_STATUS_CHECK] Task ${taskId} status: ${data.status}`);
    console.log(`[MANUS_STATUS_CHECK] Full response body:`, JSON.stringify(data, null, 2));
    
    // Based on Manus API, results might be in an array of files/outputs
    let resultUrl = undefined;
    if (data.status === 'completed' && data.output && data.output.files) {
        const imageFile = data.output.files.find((f: any) => f.type === 'image' || f.url?.match(/\.(jpg|jpeg|png)$/i));
        resultUrl = imageFile?.url;
        console.log(`[MANUS_STATUS_CHECK] Found result URL: ${resultUrl}`);
    }

    return {
        status: data.status,
        resultUrl,
        error: data.error_message,
    };
}
