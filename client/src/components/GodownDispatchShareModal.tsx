import React, { useState, useMemo } from 'react';
import type { GodownTransfer } from '../types/godown';
import { X, Check, Copy, ExternalLink, Phone } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transfers: GodownTransfer[];
  selectedTransfer?: GodownTransfer | null;
  defaultDate?: string;
  defaultGodown?: string;
}

// Crisp WhatsApp SVG Icon for UI buttons
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
  </svg>
);

export const GodownDispatchShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transfers,
  selectedTransfer,
  defaultDate,
  defaultGodown
}) => {
  const [activeTab, setActiveTab] = useState<'driver' | 'godown' | 'supervisor' | 'accountant'>('driver');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [selectedGodown, setSelectedGodown] = useState<string>('all');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // When modal opens/changes
  React.useEffect(() => {
    if (selectedTransfer) {
      setSelectedVehicle(selectedTransfer.vehicleNumber || 'all');
      setSelectedGodown(selectedTransfer.source || 'all');
    } else {
      setSelectedVehicle('all');
      setSelectedGodown(defaultGodown || 'all');
    }
  }, [selectedTransfer, isOpen, defaultGodown]);

  const isSingleDispatch = Boolean(selectedTransfer);

  // Active items: if selectedTransfer was clicked on a row, strictly use THAT transfer ONLY!
  const activeTransfers = useMemo(() => {
    if (selectedTransfer) {
      return [selectedTransfer];
    }
    return transfers.filter(tr => tr.status !== 'Cancelled');
  }, [selectedTransfer, transfers]);

  // Unique vehicles available in active transfers
  const uniqueVehicles = useMemo(() => {
    const map = new Map<string, string>();
    activeTransfers.forEach(tr => {
      if (tr.vehicleNumber) {
        map.set(tr.vehicleNumber, tr.driverName || 'Driver');
      }
    });
    return Array.from(map.entries()).map(([veh, driver]) => ({ vehicleNumber: veh, driverName: driver }));
  }, [activeTransfers]);

  // Unique source godowns in active transfers
  const uniqueGodowns = useMemo(() => {
    const set = new Set<string>();
    activeTransfers.forEach(tr => {
      if (tr.source) set.add(tr.source);
    });
    return Array.from(set);
  }, [activeTransfers]);

  // Clean date formatter (DD/MM/YYYY)
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Clean 12-hour time formatter (hh:mm AM/PM) - strictly NO delivery time!
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Aggregate product counts
  const getProductCounts = (items: GodownTransfer[]) => {
    let standard = 0;
    let premium = 0;
    let alhaj = 0;
    items.forEach(tr => {
      if (tr.product === 'Standard') standard += tr.quantity;
      else if (tr.product === 'Premium') premium += tr.quantity;
      else if (tr.product === 'Alhaj') alhaj += tr.quantity;
      else standard += tr.quantity;
    });
    return {
      standard,
      premium,
      alhaj,
      total: standard + premium + alhaj
    };
  };

  // 1. DRIVER MESSAGE (EMOJI ONLY IN HEADING, BOLD ATTRIBUTES, NO DELIVERY TIME)
  const generateDriverMessage = (): string => {
    if (activeTransfers.length === 0) return 'No dispatch details available for driver.';

    // SINGLE DISPATCH (When clicked on a row)
    if (selectedTransfer) {
      const tr = selectedTransfer;
      const formattedDate = formatDate(tr.date);
      const formattedTime = formatTime(tr.dispatchTime);

      const lines = [
        `🚚 *DISPATCH DETAILS - DRIVER*`,
        `----------------------------------------`,
        `*Date:* ${formattedDate}`,
        formattedTime ? `*Dispatch Time:* ${formattedTime}` : null,
        `*Vehicle No:* ${tr.vehicleNumber}`,
        tr.driverName ? `*Driver:* ${tr.driverName}` : null,
        ``,
        `*Route:* ${tr.source} -> ${tr.destination}`,
        ``,
        `*Cargo Details:*`,
        `- ${tr.product}: ${tr.quantity} Boxes`,
        `*Total Quantity:* ${tr.quantity} Boxes`,
        `----------------------------------------`,
        `*Note:* Please verify physical box count before departure and drive safely.`
      ];

      return lines.filter(Boolean).join('\n');
    }

    // MULTIPLE DISPATCHES / PLAN
    const vehicleFilteredTransfers = selectedVehicle === 'all' 
      ? activeTransfers 
      : activeTransfers.filter(tr => tr.vehicleNumber === selectedVehicle);

    if (vehicleFilteredTransfers.length === 0) return 'No dispatches found for selected vehicle.';

    const vehicleGroups = new Map<string, GodownTransfer[]>();
    vehicleFilteredTransfers.forEach(tr => {
      const list = vehicleGroups.get(tr.vehicleNumber) || [];
      list.push(tr);
      vehicleGroups.set(tr.vehicleNumber, list);
    });

    const targetDate = formatDate(vehicleFilteredTransfers[0]?.date || defaultDate);

    if (vehicleGroups.size === 1) {
      const [vehNo, items] = Array.from(vehicleGroups.entries())[0];
      const driverName = items[0]?.driverName;
      const counts = getProductCounts(items);
      const dispatchTime = formatTime(items[0]?.dispatchTime);
      const routes = Array.from(new Set(items.map(it => `${it.source} -> ${it.destination}`)));

      const lines = [
        `🚚 *DISPATCH DETAILS - DRIVER*`,
        `----------------------------------------`,
        `*Date:* ${targetDate}`,
        dispatchTime ? `*Dispatch Time:* ${dispatchTime}` : null,
        `*Vehicle No:* ${vehNo}`,
        driverName ? `*Driver:* ${driverName}` : null,
        ``,
        `*Route:*`,
        ...routes.map(r => `- ${r}`),
        ``,
        `*Cargo Details:*`
      ];

      if (counts.standard > 0) lines.push(`- Standard: ${counts.standard} Boxes`);
      if (counts.premium > 0) lines.push(`- Premium: ${counts.premium} Boxes`);
      if (counts.alhaj > 0) lines.push(`- Alhaj: ${counts.alhaj} Boxes`);
      lines.push(`*Total Quantity:* ${counts.total} Boxes`);
      lines.push(`----------------------------------------`);
      lines.push(`*Note:* Please verify physical box count before departure and drive safely.`);

      return lines.filter(Boolean).join('\n');
    }

    // All vehicles summary
    const grandCounts = getProductCounts(vehicleFilteredTransfers);
    const lines = [
      `🚚 *DISPATCH PLAN - DRIVERS*`,
      `----------------------------------------`,
      `*Date:* ${targetDate}`,
      `*Total Vehicles:* ${vehicleGroups.size}`,
      `*Total Dispatches:* ${grandCounts.total} Boxes`,
      `----------------------------------------`
    ];

    let idx = 1;
    vehicleGroups.forEach((items, vehNo) => {
      const driver = items[0]?.driverName || 'Driver';
      const vehCounts = getProductCounts(items);
      const time = formatTime(items[0]?.dispatchTime);
      const routeStr = Array.from(new Set(items.map(it => `${it.source} -> ${it.destination}`))).join(', ');

      lines.push(``);
      lines.push(`${idx}. *Vehicle:* ${vehNo} (*Driver:* ${driver})`);
      if (time) lines.push(`   *Dispatch Time:* ${time}`);
      lines.push(`   *Route:* ${routeStr}`);

      const itemDetails: string[] = [];
      if (vehCounts.standard > 0) itemDetails.push(`Standard: ${vehCounts.standard}`);
      if (vehCounts.premium > 0) itemDetails.push(`Premium: ${vehCounts.premium}`);
      if (vehCounts.alhaj > 0) itemDetails.push(`Alhaj: ${vehCounts.alhaj}`);

      lines.push(`   *Cargo:* ${itemDetails.join(', ')}`);
      lines.push(`   *Vehicle Total:* ${vehCounts.total} Boxes`);
      idx++;
    });

    lines.push(``);
    lines.push(`----------------------------------------`);
    lines.push(`*Note:* Drivers please verify physical box count before departure.`);

    return lines.join('\n');
  };

  // 2. GODOWN TEAM MESSAGE (EMOJI ONLY IN HEADING, BOLD ATTRIBUTES, NO DELIVERY TIME)
  const generateGodownMessage = (): string => {
    if (activeTransfers.length === 0) return 'No dispatch details available for godown team.';

    // SINGLE DISPATCH (When clicked on a row)
    if (selectedTransfer) {
      const tr = selectedTransfer;
      const formattedDate = formatDate(tr.date);
      const formattedTime = formatTime(tr.dispatchTime);

      const lines = [
        `🏬 *GODOWN DISPATCH SLIP (PULIKKUTH ENTERPRISES)*`,
        `----------------------------------------`,
        `*Company:* PULIKKUTH ENTERPRISES`,
        `*Date:* ${formattedDate}`,
        formattedTime ? `*Dispatch Time:* ${formattedTime}` : null,
        `*Vehicle No:* ${tr.vehicleNumber}`,
        tr.driverName ? `*Driver:* ${tr.driverName}` : null,
        ``,
        `*From:* ${tr.source}`,
        `*To:* ${tr.destination}`,
        ``,
        `*Loading Details:*`,
        `- ${tr.product}: ${tr.quantity} Boxes`,
        `*Total to Load:* ${tr.quantity} Boxes`,
        `----------------------------------------`,
        `*Note:* Verify physical box count with driver before gate release.`
      ];

      return lines.filter(Boolean).join('\n');
    }

    // MULTIPLE DISPATCHES / PLAN
    const godownFilteredTransfers = selectedGodown === 'all'
      ? activeTransfers
      : activeTransfers.filter(tr => tr.source === selectedGodown);

    if (godownFilteredTransfers.length === 0) return 'No dispatches found for selected godown.';

    const targetDate = formatDate(godownFilteredTransfers[0]?.date || defaultDate);
    const grandCounts = getProductCounts(godownFilteredTransfers);

    const lines = [
      `🏬 *GODOWN DISPATCH & LOADING PLAN (PULIKKUTH ENTERPRISES)*`,
      `----------------------------------------`,
      `*Company:* PULIKKUTH ENTERPRISES`,
      `*Date:* ${targetDate}`,
      selectedGodown !== 'all' ? `*Location:* ${selectedGodown}` : `*Location:* All Godowns`,
      ``,
      `*Summary:*`
    ];

    if (grandCounts.standard > 0) lines.push(`- Standard: ${grandCounts.standard} Boxes`);
    if (grandCounts.premium > 0) lines.push(`- Premium: ${grandCounts.premium} Boxes`);
    if (grandCounts.alhaj > 0) lines.push(`- Alhaj: ${grandCounts.alhaj} Boxes`);
    lines.push(`*Grand Total:* ${grandCounts.total} Boxes`);
    lines.push(`----------------------------------------`);
    lines.push(`*Loading Schedule:*`);

    const vehicleGroups = new Map<string, GodownTransfer[]>();
    godownFilteredTransfers.forEach(tr => {
      const list = vehicleGroups.get(tr.vehicleNumber) || [];
      list.push(tr);
      vehicleGroups.set(tr.vehicleNumber, list);
    });

    let vIdx = 1;
    vehicleGroups.forEach((items, vehNo) => {
      const driver = items[0]?.driverName || 'Driver';
      const vehCounts = getProductCounts(items);
      const time = formatTime(items[0]?.dispatchTime);
      const destinationStr = Array.from(new Set(items.map(it => it.destination))).join(', ');
      const sourceStr = Array.from(new Set(items.map(it => it.source))).join(', ');

      lines.push(``);
      lines.push(`${vIdx}. *Vehicle:* ${vehNo} (*Driver:* ${driver})`);
      if (time) lines.push(`   *Dispatch Time:* ${time}`);
      lines.push(`   *Route:* ${sourceStr} -> ${destinationStr}`);

      const parts: string[] = [];
      if (vehCounts.standard > 0) parts.push(`Standard: ${vehCounts.standard}`);
      if (vehCounts.premium > 0) parts.push(`Premium: ${vehCounts.premium}`);
      if (vehCounts.alhaj > 0) parts.push(`Alhaj: ${vehCounts.alhaj}`);

      lines.push(`   *Items:* ${parts.join(', ')}`);
      lines.push(`   *Total:* ${vehCounts.total} Boxes`);
      vIdx++;
    });

    lines.push(``);
    lines.push(`----------------------------------------`);
    lines.push(`*Note:* Verify physical box count with driver before gate release.`);

    return lines.join('\n');
  };

  // 3. PRODUCTION SUPERVISOR MESSAGE (EMOJI ONLY IN HEADING, BOLD ATTRIBUTES, NO DELIVERY TIME)
  const generateSupervisorMessage = (): string => {
    if (activeTransfers.length === 0) return 'No dispatch details available for production supervisor.';

    // SINGLE DISPATCH (When clicked on a row)
    if (selectedTransfer) {
      const tr = selectedTransfer;
      const formattedDate = formatDate(tr.date);
      const formattedTime = formatTime(tr.dispatchTime);

      const lines = [
        `👷 *PRODUCTION DISPATCH SLIP*`,
        `----------------------------------------`,
        `*Date:* ${formattedDate}`,
        formattedTime ? `*Dispatch Time:* ${formattedTime}` : null,
        `*Destination:* ${tr.destination}`,
        `*Vehicle No:* ${tr.vehicleNumber}${tr.driverName ? ` (${tr.driverName})` : ''}`,
        ``,
        `*Required Quantity:*`,
        `- ${tr.product}: ${tr.quantity} Boxes`,
        `*Total Dispatched:* ${tr.quantity} Boxes`,
        `----------------------------------------`,
        `*Note:* Ensure production batches are staged for loading.`
      ];

      return lines.filter(Boolean).join('\n');
    }

    // MULTIPLE DISPATCHES / PLAN
    const targetDate = formatDate(activeTransfers[0]?.date || defaultDate);
    const grandCounts = getProductCounts(activeTransfers);

    const lines = [
      `👷 *PRODUCTION SUPERVISOR - DISPATCH PLAN*`,
      `----------------------------------------`,
      `*Date:* ${targetDate}`,
      ``,
      `*Production Requirement:*`
    ];

    if (grandCounts.standard > 0) lines.push(`- Standard: ${grandCounts.standard} Boxes`);
    if (grandCounts.premium > 0) lines.push(`- Premium: ${grandCounts.premium} Boxes`);
    if (grandCounts.alhaj > 0) lines.push(`- Alhaj: ${grandCounts.alhaj} Boxes`);
    lines.push(`*Total Required:* ${grandCounts.total} Boxes`);
    lines.push(`----------------------------------------`);
    lines.push(`*Branch Allocation:*`);

    const destGroups = new Map<string, GodownTransfer[]>();
    activeTransfers.forEach(tr => {
      const list = destGroups.get(tr.destination) || [];
      list.push(tr);
      destGroups.set(tr.destination, list);
    });

    destGroups.forEach((items, destName) => {
      const destCounts = getProductCounts(items);
      const subParts: string[] = [];
      if (destCounts.standard > 0) subParts.push(`Standard: ${destCounts.standard}`);
      if (destCounts.premium > 0) subParts.push(`Premium: ${destCounts.premium}`);
      if (destCounts.alhaj > 0) subParts.push(`Alhaj: ${destCounts.alhaj}`);

      lines.push(`- ${destName}: ${destCounts.total} Boxes (${subParts.join(', ') || 'Mixed'})`);
    });

    lines.push(`----------------------------------------`);
    lines.push(`*Scheduled Vehicles:*`);

    const vehicleGroups = new Map<string, GodownTransfer[]>();
    activeTransfers.forEach(tr => {
      const list = vehicleGroups.get(tr.vehicleNumber) || [];
      list.push(tr);
      vehicleGroups.set(tr.vehicleNumber, list);
    });

    vehicleGroups.forEach((items, vehNo) => {
      const driver = items[0]?.driverName || 'Driver';
      const vehTotal = items.reduce((sum, it) => sum + it.quantity, 0);
      const destName = Array.from(new Set(items.map(it => it.destination))).join(', ');
      lines.push(`- ${vehNo} (${driver}) -> ${destName} (${vehTotal} Boxes)`);
    });

    lines.push(``);
    lines.push(`----------------------------------------`);
    lines.push(`*Note:* Ensure required production batches are ready and staged for vehicle loading on time.`);

    return lines.join('\n');
  };

  // 4. ACCOUNTANT MESSAGE (EMOJI ONLY IN HEADING, BOLD ATTRIBUTES, NO DELIVERY TIME)
  const generateAccountantMessage = (): string => {
    if (activeTransfers.length === 0) return 'No dispatch details available for accountant.';

    // SINGLE DISPATCH (When clicked on a row)
    if (selectedTransfer) {
      const tr = selectedTransfer;
      const formattedDate = formatDate(tr.date);
      const formattedTime = formatTime(tr.dispatchTime);

      const lines = [
        `📑 *DISPATCH VOUCHER - ACCOUNTANT*`,
        `----------------------------------------`,
        `*Date:* ${formattedDate}`,
        formattedTime ? `*Dispatch Time:* ${formattedTime}` : null,
        `*Vehicle No:* ${tr.vehicleNumber}`,
        tr.driverName ? `*Driver:* ${tr.driverName}` : null,
        ``,
        `*Source (Outflow):* ${tr.source}`,
        `*Destination (Inflow):* ${tr.destination}`,
        ``,
        `*Stock Transfer Items:*`,
        `- ${tr.product}: ${tr.quantity} Boxes`,
        `*Total Quantity:* ${tr.quantity} Boxes`,
        `----------------------------------------`
      ];

      return lines.filter(Boolean).join('\n');
    }

    // MULTIPLE DISPATCHES / PLAN
    const targetDate = formatDate(activeTransfers[0]?.date || defaultDate);
    const grandCounts = getProductCounts(activeTransfers);

    const vehicleGroups = new Map<string, GodownTransfer[]>();
    activeTransfers.forEach(tr => {
      const list = vehicleGroups.get(tr.vehicleNumber) || [];
      list.push(tr);
      vehicleGroups.set(tr.vehicleNumber, list);
    });

    const lines = [
      `📑 *DISPATCH & STOCK TRANSFER SUMMARY - ACCOUNTS*`,
      `----------------------------------------`,
      `*Date:* ${targetDate}`,
      `*Total Dispatches:* ${grandCounts.total} Boxes`,
      `*Total Vehicles:* ${vehicleGroups.size}`,
      `----------------------------------------`,
      `*Total Quantity by Product:*`
    ];

    if (grandCounts.standard > 0) lines.push(`- Standard: ${grandCounts.standard} Boxes`);
    if (grandCounts.premium > 0) lines.push(`- Premium: ${grandCounts.premium} Boxes`);
    if (grandCounts.alhaj > 0) lines.push(`- Alhaj: ${grandCounts.alhaj} Boxes`);
    lines.push(`*Grand Total:* ${grandCounts.total} Boxes`);
    lines.push(`----------------------------------------`);
    lines.push(`*Transfer Records:*`);

    let accIdx = 1;
    vehicleGroups.forEach((items, vehNo) => {
      const driver = items[0]?.driverName || 'Driver';
      const vehCounts = getProductCounts(items);
      const time = formatTime(items[0]?.dispatchTime);
      const sourceStr = Array.from(new Set(items.map(it => it.source))).join(', ');
      const destinationStr = Array.from(new Set(items.map(it => it.destination))).join(', ');

      lines.push(``);
      lines.push(`${accIdx}. *Vehicle:* ${vehNo} (*Driver:* ${driver})`);
      if (time) lines.push(`   *Dispatch Time:* ${time}`);
      lines.push(`   *Transfer:* ${sourceStr} -> ${destinationStr}`);

      const parts: string[] = [];
      if (vehCounts.standard > 0) parts.push(`Standard: ${vehCounts.standard}`);
      if (vehCounts.premium > 0) parts.push(`Premium: ${vehCounts.premium}`);
      if (vehCounts.alhaj > 0) parts.push(`Alhaj: ${vehCounts.alhaj}`);

      lines.push(`   *Load:* ${parts.join(', ')}`);
      lines.push(`   *Quantity:* ${vehCounts.total} Boxes`);
      accIdx++;
    });

    lines.push(``);
    lines.push(`----------------------------------------`);

    return lines.join('\n');
  };

  const currentMessage = useMemo(() => {
    switch (activeTab) {
      case 'driver':
        return generateDriverMessage();
      case 'godown':
        return generateGodownMessage();
      case 'supervisor':
        return generateSupervisorMessage();
      case 'accountant':
        return generateAccountantMessage();
      default:
        return '';
    }
  }, [activeTab, selectedVehicle, selectedGodown, activeTransfers, selectedTransfer]);

  // Handle WhatsApp Share
  const handleShareWhatsApp = () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(currentMessage);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-card text-card-foreground w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <WhatsAppIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isSingleDispatch ? 'Share Dispatch Details' : 'Share Dispatch Plan'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isSingleDispatch 
                  ? `${selectedTransfer?.vehicleNumber} • ${selectedTransfer?.quantity} Boxes (${selectedTransfer?.product})` 
                  : 'Consolidated plan for all scheduled dispatches'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Recipient Tabs (4 roles: Driver, Godown, Supervisor, Accountant) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-muted/60 rounded-xl border">
            <button
              type="button"
              onClick={() => setActiveTab('driver')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'driver'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🚚</span>
              <span>Driver</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('godown')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'godown'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🏬</span>
              <span>Godown</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supervisor')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'supervisor'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>👷</span>
              <span>Supervisor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accountant')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'accountant'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>📑</span>
              <span>Accountant</span>
            </button>
          </div>

          {/* Context Banner for Single Dispatch vs Full Plan */}
          {isSingleDispatch ? (
            <div className="bg-muted/30 border rounded-lg px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Single Dispatch:</span>
                <span>{selectedTransfer?.vehicleNumber}</span>
                {selectedTransfer?.driverName && <span className="text-muted-foreground">({selectedTransfer.driverName})</span>}
              </div>
              <div className="text-muted-foreground text-[11px]">
                {selectedTransfer?.source} → {selectedTransfer?.destination}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between bg-muted/20 p-2.5 rounded-xl border">
              {activeTab === 'driver' && (
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Vehicle:
                  </label>
                  <select
                    value={selectedVehicle}
                    onChange={e => setSelectedVehicle(e.target.value)}
                    className="bg-background border rounded-lg px-2 py-1 text-xs font-medium w-full max-w-[220px] outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Vehicles (Full Plan)</option>
                    {uniqueVehicles.map(v => (
                      <option key={v.vehicleNumber} value={v.vehicleNumber}>
                        {v.vehicleNumber} ({v.driverName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'godown' && (
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Godown:
                  </label>
                  <select
                    value={selectedGodown}
                    onChange={e => setSelectedGodown(e.target.value)}
                    className="bg-background border rounded-lg px-2 py-1 text-xs font-medium w-full max-w-[220px] outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Godowns</option>
                    {uniqueGodowns.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              {(activeTab === 'supervisor' || activeTab === 'accountant') && (
                <span className="text-xs text-muted-foreground">
                  {activeTab === 'supervisor' 
                    ? 'Consolidated production requirements for active dispatches' 
                    : 'Stock transfer ledger reconciliation for all dispatches'}
                </span>
              )}
            </div>
          )}

          {/* Optional Phone Number */}
          <div className="flex items-center gap-2 bg-muted/20 p-2 rounded-lg border">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Recipient phone number (optional, e.g. 919876543210)"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="bg-background border rounded-md px-2.5 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>

          {/* Clean Message Preview Box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span className="font-semibold">Message Preview</span>
              <span className="text-[11px] opacity-75">Phone format ready</span>
            </div>

            <div className="relative rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-3.5 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto select-text shadow-inner text-foreground">
              {currentMessage}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 border transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current" />
              <span>Share WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
