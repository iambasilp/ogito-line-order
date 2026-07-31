import React, { useState, useEffect } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import QRCode from 'qrcode';

export const PaymentQRIcon: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [appliedAmount, setAppliedAmount] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const upiId = 'pulikkuth2022@fbl';
  const payeeName = 'PULIKKUTH ENTERPRISES';
  
  useEffect(() => {
    let upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}`;
    if (appliedAmount && !isNaN(Number(appliedAmount)) && Number(appliedAmount) > 0) {
      upiString += `&am=${appliedAmount}`;
    }

    QRCode.toDataURL(upiString, { 
      width: 300, 
      margin: 1, 
      color: { dark: '#000000', light: '#ffffff' } 
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Error generating QR', err));
  }, [appliedAmount]);



  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative text-white/80 hover:text-white hover:bg-white/10"
        aria-label="Payment QR Code"
      >
        <QrCode className="h-5 w-5" />
      </Button>
      
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setAmount('');
          setAppliedAmount('');
        }
      }}>
        <DialogContent className="sm:max-w-md flex flex-col items-center p-6 border-orange-200 dark:border-orange-900">
          <DialogHeader className="w-full flex flex-row items-center justify-between mb-2 relative">
            <DialogTitle className="text-xl font-bold text-orange-600 dark:text-orange-500 text-center w-full">Scan to Pay</DialogTitle>
            <div className="absolute right-0 top-0">
              <DialogClose onClose={() => { setIsOpen(false); setAmount(''); setAppliedAmount(''); }} />
            </div>
          </DialogHeader>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center w-full max-w-[320px]">
            <div className="bg-[#003399] text-white font-bold px-4 py-2 rounded mb-4 w-full text-center text-lg">
              FEDERAL BANK
            </div>
            
            <div className="text-center font-bold text-sm text-gray-800 mb-2">
              SCAN QR CODE TO PAY
            </div>

            <div className="w-full px-2 mb-3 flex gap-2">
              <Input
                type="number"
                placeholder="Amount (Optional)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAppliedAmount(amount);
                  }
                }}
                className="text-center font-bold h-10 border-gray-300 focus-visible:ring-orange-500 bg-gray-50 flex-1"
                min="0"
                step="any"
              />
              <Button 
                onClick={() => setAppliedAmount(amount)}
                className="bg-orange-600 hover:bg-orange-700 text-white h-10 px-4"
              >
                OK
              </Button>
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
