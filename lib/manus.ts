import axios from 'axios';
import FormData from 'form-data';
import { createClient } from '@/lib/supabase-server';

const MANUS_API_KEY = process.env.MANUS_API_KEY as string;
const MANUS_BASE_URL = 'https://api.manus.im/v1'; // Switched to .im as suggested

console.log('[MANUS_INIT] API Key exists:', !!MANUS_API_KEY);
if (!MANUS_API_KEY) {
    console.error('[MANUS_CRITICAL] MANUS_API_KEY is missing from environment variables!');
}

export async function uploadFileToManus(imageUrl: string): Promise<string> {
    console.log(`[MANUS_FILE_UPLOAD] Initiating upload to ${MANUS_BASE_URL}/files`);
    
    try {
        // Fetch the image as a buffer
        const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imageRes.data, 'binary');

        const form = new FormData();
        form.append('file', buffer, {
            filename: 'food.jpg',
            contentType: 'image/jpeg'
        });

        const manusRes = await axios.post(`${MANUS_BASE_URL}/files`, form, {
            headers: {
                ...form.getHeaders(),
                'X-API-Key': MANUS_API_KEY,
            }
        });

        console.log(`[MANUS_FILE_UPLOAD] Response status: ${manusRes.status}`);
        console.log(`[MANUS_FILE_UPLOAD] Response body:`, JSON.stringify(manusRes.data, null, 2));

        return manusRes.data.id;
    } catch (err: any) {
        const errorData = err.response?.data || err.message;
        console.error(`[MANUS_FILE_UPLOAD_ERROR]`, errorData);
        throw new Error(`Manus file upload failed: ${JSON.stringify(errorData)}`);
    }
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

    console.log(`[MANUS_TASK_CREATE] URL: ${MANUS_BASE_URL}/tasks`);
    console.log(`[MANUS_TASK_CREATE] Request body:`, JSON.stringify(body, null, 2));

    try {
        const res = await axios.post(`${MANUS_BASE_URL}/tasks`, body, {
            headers: {
                'X-API-Key': MANUS_API_KEY,
                'Content-Type': 'application/json',
            }
        });

        console.log(`[MANUS_TASK_CREATE] Response status: ${res.status}`);
        console.log(`[MANUS_TASK_CREATE] Response body:`, JSON.stringify(res.data, null, 2));

        return res.data.id;
    } catch (err: any) {
        const errorData = err.response?.data || err.message;
        console.error(`[MANUS_TASK_CREATE_ERROR]`, errorData);
        throw new Error(`Manus task creation failed: ${JSON.stringify(errorData)}`);
    }
}

export async function getManusTaskStatus(taskId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    resultUrl?: string;
    error?: string;
}> {
    console.log(`[MANUS_STATUS_CHECK] URL: ${MANUS_BASE_URL}/tasks/${taskId}`);
    
    try {
        const res = await axios.get(`${MANUS_BASE_URL}/tasks/${taskId}`, {
            headers: {
                'X-API-Key': MANUS_API_KEY,
            }
        });

        const data = res.data;
        console.log(`[MANUS_STATUS_CHECK] Task ${taskId} status: ${data.status}`);
        // console.log(`[MANUS_STATUS_CHECK] Full response body:`, JSON.stringify(data, null, 2));
        
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
    } catch (err: any) {
        const errorData = err.response?.data || err.message;
        console.error(`[MANUS_STATUS_CHECK_ERROR]`, errorData);
        throw new Error(`Manus status check failed: ${JSON.stringify(errorData)}`);
    }
}
