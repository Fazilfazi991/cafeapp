import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Helper to validate and format E.164 numbers (specifically targeting UAE for this use case)
export function formatPhoneNumber(phone: string): string | null {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with 05 (UAE local format), magically convert to +9715
    if (cleaned.startsWith('05')) {
        cleaned = '+971' + cleaned.substring(1);
    }

    // If it starts with 971 but has no +, add the +
    if (cleaned.startsWith('971')) {
        cleaned = '+' + cleaned;
    }

    // Basic E.164 validation: starts with +, followed by 10-15 digits
    const e164Regex = /^\+[1-9]\d{10,14}$/;

    if (e164Regex.test(cleaned)) {
        return cleaned;
    }

    return null;
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const restaurantId = url.searchParams.get('restaurantId')

        if (!restaurantId) {
            return NextResponse.json({ error: 'Missing restaurant ID' }, { status: 400 })
        }

        const supabase = createClient()

        // Ensure user owns this restaurant
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })

        if (error) throw error;

        return NextResponse.json({ contacts })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { restaurantId, name, phone_number, group_name } = await request.json()

        if (!restaurantId || !phone_number) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        // Format to E.164
        const formattedPhone = formatPhoneNumber(phone_number);

        if (!formattedPhone) {
            return NextResponse.json({ error: 'Invalid phone number format. Must be a valid international number.' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('contacts')
            .insert({
                restaurant_id: restaurantId,
                name: name || null,
                phone_number: formattedPhone,
                group_name: group_name || null
            })
            .select()
            .single()

        if (error) {
            // Handle duplicate numbers nicely if we add a unique constraint later
            if (error.code === '23505') {
                return NextResponse.json({ error: 'This phone number already exists in your contacts' }, { status: 400 })
            }
            throw error;
        }

        return NextResponse.json({ success: true, contact: data })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing contact ID' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id)

        if (error) throw error;

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
