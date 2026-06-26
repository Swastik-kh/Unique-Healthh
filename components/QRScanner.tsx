import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
    title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose, title = "QR कोड स्क्यान गर्नुहोस्" }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scanner.render((decodedText) => {
            onScanSuccess(decodedText);
            scanner.clear().then(() => {
                onClose();
            }).catch(error => {
                console.error("Failed to clear scanner", error);
                onClose();
            });
        }, (errorMessage) => {
            // parse error, ignore it
        });

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => console.error("Failed to clear scanner on unmount", error));
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6">
                    <div id="qr-reader" className="overflow-hidden rounded-xl border border-slate-200"></div>
                    <p className="text-xs text-slate-500 text-center mt-4">
                        क्यामराको अगाडि QR कोड राख्नुहोस्।
                    </p>
                </div>
            </div>
        </div>
    );
};
