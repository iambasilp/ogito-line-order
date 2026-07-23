import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import QRCode from 'qrcode';

export const PaymentQRIcon: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const upiId = 'pulikkuth2022@fbl';
  const payeeName = 'PULIKKUTH ENTERPRISES';
  
  useEffect(() => {
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}`;
    QRCode.toDataURL(upiString, { 
      width: 300, 
      margin: 1, 
      color: { dark: '#000000', light: '#ffffff' } 
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Error generating QR', err));
  }, []);

  // Two-finger tap to open effect
  useEffect(() => {
    let lastTapTime = 0;

    const handleTouchStart = (event: TouchEvent) => {
      // Check if exactly two fingers are touching the screen
      if (event.touches.length === 2) {
        const now = Date.now();
        // Debounce by 500ms to prevent multiple triggers from a single two-finger tap
        if (now - lastTapTime > 500) {
          lastTapTime = now;
          setIsOpen(true);
        }
      }
    };

    // Use passive listener for best performance
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center p-6 border-orange-200 dark:border-orange-900">
          <DialogHeader className="w-full flex flex-row items-center justify-between mb-2 relative">
            <DialogTitle className="text-xl font-bold text-orange-600 dark:text-orange-500 text-center w-full">Scan to Pay</DialogTitle>
            <div className="absolute right-0 top-0">
              <DialogClose onClose={() => setIsOpen(false)} />
            </div>
          </DialogHeader>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center w-full max-w-[320px]">
            <div className="bg-[#003399] text-white font-bold px-4 py-2 rounded mb-4 w-full text-center text-lg">
              FEDERAL BANK
            </div>
            
            <div className="text-center font-bold text-sm text-gray-800 mb-2">
              SCAN QR CODE TO PAY
            </div>
            
            <div className="bg-white p-2 rounded-lg mb-2 border border-gray-100">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Payment QR Code" className="w-[220px] h-[220px] object-contain" />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>
              )}
            </div>
            
            <div className="mt-2 text-center pb-2">
              <p className="font-bold text-gray-900 text-[15px]">{upiId}</p>
              <p className="text-[13px] text-gray-800 mt-2 font-bold uppercase">{payeeName}</p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col items-center justify-center w-full gap-2 opacity-80">
             <span className="text-xs text-muted-foreground">Use any of these apps to scan the QR</span>
             <div className="flex gap-4 items-center mt-1">
               <span className="text-xs font-bold text-blue-600">GPay</span>
               <span className="text-xs font-bold text-purple-600">PhonePe</span>
               <span className="text-xs font-bold text-sky-500">Paytm</span>
               <span className="text-xs font-bold text-orange-600">BHIM</span>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
