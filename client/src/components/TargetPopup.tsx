import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Target, TrendingUp, Award, CheckCircle } from 'lucide-react';

export function TargetPopup() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Check if the popup has been shown before
    const hasSeenPopup = localStorage.getItem('targetPopupShown');
    if (!hasSeenPopup) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('targetPopupShown', 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="w-[95%] sm:max-w-md p-0 overflow-hidden bg-gradient-to-br from-indigo-50 to-white">
        <DialogHeader className="p-6 pb-2 border-none bg-transparent">
          <DialogTitle className="text-center text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {step === 1 ? "Monthly Goal" : "Your Achievements"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-2">
          {step === 1 ? (
            <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center mb-2 shadow-inner">
                <Target className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-800">Your Target for This Month</h3>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-50 w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <p className="text-3xl font-bold text-blue-700">₹ 50,000</p>
                <p className="text-sm text-gray-500 mt-1">Let's crush it together!</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex justify-center mb-2">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                  <Award className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-center text-gray-800 mb-2">Last Month's Performance</h3>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 flex items-center gap-4">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Last Month Target Achieved</p>
                  <p className="text-xl font-bold text-emerald-700">₹ 45,000</p>
                </div>
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50/50 mt-4 flex justify-between items-center border-t border-gray-100">
          <div className="flex space-x-1 border p-1 rounded-full bg-white">
            <div className={`h-2 w-8 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-gray-200'} transition-colors duration-300`}></div>
            <div className={`h-2 w-8 rounded-full ${step === 2 ? 'bg-indigo-600' : 'bg-gray-200'} transition-colors duration-300`}></div>
          </div>
          <Button 
            onClick={handleNext} 
            className="rounded-full px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {step === 1 ? 'View Achievements' : "OK, Let's Go!"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
