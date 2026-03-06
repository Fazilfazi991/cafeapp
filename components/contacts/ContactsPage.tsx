'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Upload, Trash2, Users, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react'
import { formatPhoneNumber } from '@/app/api/contacts/route'

type Contact = {
    id: string;
    name: string | null;
    phone_number: string;
    group_name: string | null;
    opted_out: boolean;
}

export default function ContactsPage({ restaurantId }: { restaurantId: string }) {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newContact, setNewContact] = useState({ name: '', phone_number: '', group_name: '' })
    const [addError, setAddError] = useState<string | null>(null)

    // CSV Import State
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [importStats, setImportStats] = useState<{ success: number, failed: number, total: number } | null>(null)
    const [validationErrors, setValidationErrors] = useState<{ row: number, error: string }[]>([])

    useEffect(() => {
        fetchContacts()
    }, [restaurantId])

    const fetchContacts = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/contacts?restaurantId=${restaurantId}`)
            const data = await res.json()
            if (data.contacts) setContacts(data.contacts)
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsAdding(true)
        setAddError(null)

        try {
            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, ...newContact })
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            setContacts([data.contact, ...contacts])
            setNewContact({ name: '', phone_number: '', group_name: '' })
        } catch (err: any) {
            setAddError(err.message)
        } finally {
            setIsAdding(false)
        }
    }

    const handleDeleteContact = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contact?')) return

        try {
            await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
            setContacts(contacts.filter(c => c.id !== id))
        } catch (err) {
            console.error(err)
        }
    }

    // --- CSV Import Logic ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        setImportStats(null)
        setValidationErrors([])

        try {
            const text = await file.text()
            // Very basic CSV parsing (splits by newline, then by comma)
            const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()))

            // Assume header row exists if first row doesn't look like a phone number
            let startIndex = 0
            if (rows.length > 0 && !rows[0].some(cell => /\d/.test(cell))) {
                startIndex = 1
            }

            const parsedContacts: any[] = []
            const errors: { row: number, error: string }[] = []

            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
                if (row.length === 0 || (!row[0] && !row[1])) continue; // skip empty rows

                // Simple heuristic: If row[0] has no numbers but row[1] does, it's [Name, Phone]
                // Otherwise if row[0] has numbers, we assume it's just [Phone] or [Phone, Name]
                let name = "";
                let phone = "";
                let group = "";

                if (row.length === 1) {
                    phone = row[0];
                } else if (!/\d/.test(row[0]) && /\d/.test(row[1])) {
                    name = row[0];
                    phone = row[1];
                    group = row[2] || "";
                } else {
                    phone = row[0];
                    name = row[1] || "";
                    group = row[2] || "";
                }

                if (!phone) {
                    errors.push({ row: i + 1, error: "Missing phone number" })
                    continue;
                }

                // Check and format client side first to save API calls
                // Using a simplified version of formatPhoneNumber
                let cleaned = phone.replace(/[^\d+]/g, '');
                if (cleaned.startsWith('05')) cleaned = '+971' + cleaned.substring(1);
                if (cleaned.startsWith('971')) cleaned = '+' + cleaned;

                if (!/^\+[1-9]\d{10,14}$/.test(cleaned)) {
                    errors.push({ row: i + 1, error: `Invalid format: ${phone}. Examples: +971501234567 or 0501234567` })
                    continue;
                }

                parsedContacts.push({ name, phone_number: cleaned, group_name: group })
            }

            if (parsedContacts.length === 0) {
                setValidationErrors(errors)
                setIsImporting(false)
                return;
            }

            // Batch send to API
            let success = 0;
            let failed = 0;

            // In production, you'd send a batch array to a dedicated /batch endpoint.
            // For simplicity here, we iteratively call the single POST but promise.all it in chunks
            const chunkSize = 50;
            for (let i = 0; i < parsedContacts.length; i += chunkSize) {
                const chunk = parsedContacts.slice(i, i + chunkSize);

                await Promise.all(chunk.map(async (contact) => {
                    try {
                        const res = await fetch('/api/contacts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ restaurantId, ...contact })
                        })
                        if (res.ok) success++; else failed++;
                    } catch (e) { failed++; }
                }));
            }

            setImportStats({ success, failed, total: parsedContacts.length })
            setValidationErrors(errors)
            fetchContacts() // Refresh list

        } catch (err) {
            console.error(err)
            alert("Failed to parse CSV file")
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold mb-8">WhatsApp Contacts</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Add/Import */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    {/* Add Single */}
                    <div className="bg-white rounded-xl border p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Plus size={20} /> Add Contact
                        </h2>
                        <form onSubmit={handleAddContact} className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Phone Number *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. +971501234567 or 0501234567"
                                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                                    value={newContact.phone_number}
                                    onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Name (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. John Doe"
                                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                />
                            </div>

                            {addError && <p className="text-red-500 text-xs mt-1">{addError}</p>}

                            <button
                                disabled={isAdding}
                                className="mt-2 bg-[#1A1A1A] text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isAdding ? <Loader2 size={16} className="animate-spin" /> : 'Save Contact'}
                            </button>
                        </form>
                    </div>

                    {/* Import CSV */}
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-gray-600">
                            <Upload size={24} />
                        </div>
                        <h3 className="font-bold text-[#1A1A1A] mb-1">Upload CSV</h3>
                        <p className="text-xs text-gray-500 mb-4 px-4">Upload a file containing multiple contacts. Format: Name, Phone Number.</p>

                        <input
                            type="file"
                            accept=".csv, .txt"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="bg-white border text-[#1A1A1A] px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors w-full disabled:opacity-50"
                        >
                            {isImporting ? 'Importing...' : 'Select File'}
                        </button>

                        {/* Import Results Box */}
                        {(importStats || validationErrors.length > 0) && (
                            <div className="mt-4 text-left bg-white border rounded-md p-3 text-sm">
                                {importStats && (
                                    <div className="mb-2 text-green-700 font-medium flex items-center gap-1">
                                        <CheckCircle2 size={16} /> Imported {importStats.success} of {importStats.total}
                                    </div>
                                )}
                                {validationErrors.length > 0 && (
                                    <div className="text-red-600 text-xs mt-2 border-t pt-2">
                                        <div className="font-semibold mb-1 flex items-center gap-1"><AlertCircle size={14} /> {validationErrors.length} Errors detected:</div>
                                        <div className="max-h-24 overflow-y-auto space-y-1">
                                            {validationErrors.map((err, i) => (
                                                <div key={i}>Row {err.row}: {err.error}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mt-4 flex items-start gap-2 text-left bg-blue-50 text-blue-800 p-3 rounded text-xs border border-blue-100">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <p>UAE numbers starting with <span className="font-mono bg-blue-100 px-1 rounded">05...</span> will be automatically formatted to <span className="font-mono bg-blue-100 px-1 rounded">+9715...</span> for WhatsApp broadcasting.</p>
                        </div>
                    </div>

                </div>

                {/* Right Col: List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border flex flex-col h-[600px] shadow-sm overflow-hidden">

                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                            <h2 className="font-bold flex items-center gap-2">
                                <Users size={20} className="text-gray-500" /> Contact List
                            </h2>
                            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">{contacts.length} Total</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            {isLoading ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
                            ) : contacts.length === 0 ? (
                                <div className="text-center py-20 text-gray-500">
                                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No contacts yet.</p>
                                    <p className="text-sm">Add one manually or upload a CSV.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b text-xs uppercase tracking-wider text-gray-500">
                                            <th className="font-semibold py-3 px-4">Name</th>
                                            <th className="font-semibold py-3 px-4">Phone Number</th>
                                            <th className="font-semibold py-3 px-4 w-12 text-center">Opt Out</th>
                                            <th className="font-semibold py-3 px-4 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contacts.map((contact) => (
                                            <tr key={contact.id} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 font-medium text-sm text-[#1A1A1A]">
                                                    {contact.name || <span className="text-gray-400 italic">Unknown</span>}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-mono text-gray-600">
                                                    {contact.phone_number}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {contact.opted_out ? (
                                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Stop</span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteContact(contact.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}
