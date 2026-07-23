import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // Create the scanner instance
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: 200,
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false
    );
    
    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      // Handle the scanned code
      scanner.clear().then(() => {
        onScanRef.current(decodedText);
      }).catch(err => {
        console.error("Failed to clear scanner", err);
        onScanRef.current(decodedText);
      });
    };

    const onScanFailure = () => {
      // Just log or ignore, html5-qrcode scans many times a second
    };

    scanner.render(onScanSuccess, onScanFailure);

    // Cleanup when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-background rounded-lg w-full">
      <div className="flex justify-between items-center w-full mb-4">
        <h3 className="text-lg font-semibold">Scan QR Code</h3>
        <Button variant="ghost" size="icon" onClick={onClose} type="button">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div id="reader" className="w-full overflow-hidden rounded-lg shadow-sm border bg-black text-white"></div>
      <p className="text-sm text-muted-foreground mt-4 text-center">
        Point your camera at the customer's QR code.
      </p>
    </div>
  );
};

export default QRScanner;
