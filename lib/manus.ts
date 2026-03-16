import { createClient } from '@/lib/supabase-server';

const MANUS_API_KEY = process.env.MANUS_API_KEY as string;
const MANUS_BASE_URL = 'https://api.manus.im/v1';

console.log('[MANUS_INIT] API Key exists:', !!MANUS_API_KEY);

interface ManusTaskInput {
  prompt: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
}

export async function createManusTask({ 
  prompt, 
  imageBuffer,
  imageMimeType = 'image/jpeg'
}: ManusTaskInput): Promise<string> {
  
  let fullPrompt = prompt;
  
  // If image provided, embed as base64 in prompt
  if (imageBuffer) {
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${imageMimeType};base64,${base64}`;
    fullPrompt = `Reference image: ${dataUrl}\n\n${prompt}`;
  }

  console.log(`[MANUS_TASK_CREATE] URL: ${MANUS_BASE_URL}/tasks`);
  // Not logging full body because it contains base64 image which would flood logs
  console.log(`[MANUS_TASK_CREATE] Prompt length: ${fullPrompt.length}`);

  const response = await fetch(`${MANUS_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': MANUS_API_KEY
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      agentProfile: 'speed',
      taskMode: 'agent'
    })
  });

  const data = await response.json();
  console.log('[MANUS_TASK_CREATE] Response:', JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    throw new Error(`Manus task creation failed: ${JSON.stringify(data)}`);
  }
  
  return data.id;
}

export async function getManusTaskStatus(taskId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    resultUrl?: string;
    error?: string;
}> {
    console.log(`[MANUS_STATUS_CHECK] URL: ${MANUS_BASE_URL}/tasks/${taskId}`);
    
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
