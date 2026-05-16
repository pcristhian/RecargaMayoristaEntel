'use client';

import { MessageCircle, FileText } from 'lucide-react';

export default function FileTypeSelector({ selectedType, onTypeChange }) {
    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Tipo de archivo:</h3>
            <div className="flex gap-4">
                <button
                    onClick={() => onTypeChange('whatsapp')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${selectedType === 'whatsapp'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                >
                    <MessageCircle size={20} />
                    <span>WhatsApp Chat (.txt)</span>
                </button>
                <button
                    onClick={() => onTypeChange('sms')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${selectedType === 'sms'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                >
                    <FileText size={20} />
                    <span>SMS Backup (.xml)</span>
                </button>
            </div>
        </div>
    );
}