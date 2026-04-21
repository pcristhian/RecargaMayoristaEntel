'use client';

import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

export default function FileUploader({ onFileUpload }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'text/plain': ['.txt']
        },
        maxFiles: 1,
        onDrop: (acceptedFiles) => {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = () => {
                onFileUpload(reader.result);
            };
            reader.readAsText(file, 'UTF-8');
        }
    });

    return (
        <div
            {...getRootProps()}
            className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
                }
      `}
        >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
                <p className="text-green-600">Suelta el archivo aquí...</p>
            ) : (
                <div>
                    <p className="text-gray-600">Arrastra o haz clic para subir tu chat exportado</p>
                    <p className="text-sm text-gray-400 mt-2">Solo archivos .txt de WhatsApp</p>
                </div>
            )}
        </div>
    );
}