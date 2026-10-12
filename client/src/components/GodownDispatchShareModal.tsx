import React, { useState, useMemo } from 'react';
import type { GodownTransfer } from '../types/godown';
import { X, Check, Copy, ExternalLink, Truck, Warehouse, HardHat, Phone, Calendar } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transfers: GodownTransfer[];
  selectedTransfer?: GodownTransfer | null;
  defaultDate?: string;
  defaultGodown?: string;
}

// Crisp WhatsApp SVG Icon
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
  const [activeTab, setActiveTab] = useState<'driver' | 'godown' | 'supervisor'>('driver');
  const [scope, setScope] = useState<'selected' | 'all'>(selectedTransfer ? 'selected' : 'all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [selectedGodown, setSelectedGodown] = useState<string>('all');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // When modal reopens with a selectedTransfer, synchronize state
  React.useEffect(() => {
    if (selectedTransfer) {
      setScope('selected');
      setSelectedVehicle(selectedTransfer.vehicleNumber || 'all');
      setSelectedGodown(selectedTransfer.source || 'all');
    } else {
      setScope('all');
      setSelectedVehicle('all');
      setSelectedGodown(defaultGodown || 'all');
    }
  }, [selectedTransfer, isOpen, defaultGodown]);

  // Relevant transfers based on scope
  const activeTransfers = useMemo(() => {
    if (scope === 'selected' && selectedTransfer) {
      return [selectedTransfer];
    }
    // Filter out cancelled transfers from dispatch planning
    return transfers.filter(tr => tr.status !== 'Cancelled');
  }, [scope, selectedTransfer, transfers]);

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

  // Helper date formatters (NO delivery time!)
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper to aggregate products in a list of transfers
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

  // 1. DRIVER MESSAGE GENERATOR (NO DELIVERY TIME)
  const generateDriverMessage = (): string => {
    if (activeTransfers.length === 0) return 'No dispatch details available for driver.';

    // If single transfer or single vehicle chosen
    if (scope === 'selected' && selectedTransfer) {
      const tr = selectedTransfer;
      const formattedDate = formatDate(tr.date);
      const formattedTime = formatTime(tr.dispatchTime);

      return [
        `📋 *DISPATCH DETAILS - DRIVER*`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        `📅 *Date:* ${formattedDate}`,
        formattedTime ? `⏰ *Dispatch Time:* ${formattedTime}` : null,
        `🚛 *Vehicle No:* ${tr.vehicleNumber}`,
        tr.driverName ? `👤 *Driver:* ${tr.driverName}` : null,
        ``,
        `📍 *ROUTE:*`,
        `• *From:* ${tr.source}`,
        `• *To:* ${tr.destination}`,
        ``,
        `📦 *CARGO LOAD:*`,
        `• *${tr.product}:* ${tr.quantity} Boxes`,
        `─────────────────────`,
        `📦 *Total Load:* ${tr.quantity} Boxes`,
        ``,
        `⚠️ *Note:* Please verify box count before departure and drive safely.`
      ].filter(Boolean).join('\n');
    }

    // If vehicle filter applied
    const vehicleFilteredTransfers = selectedVehicle === 'all' 
      ? activeTransfers 
      : activeTransfers.filter(tr => tr.vehicleNumber === selectedVehicle);

    if (vehicleFilteredTransfers.length === 0) return 'No dispatches found for selected vehicle.';

    // Group by vehicle
    const vehicleGroups = new Map<string, GodownTransfer[]>();
    vehicleFilteredTransfers.forEach(tr => {
      const list = vehicleGroups.get(tr.vehicleNumber) || [];
      list.push(tr);
      vehicleGroups.set(tr.vehicleNumber, list);
    });

    const targetDate = formatDate(vehicleFilteredTransfers[0]?.date || defaultDate);

    // If only one vehicle in group
    if (vehicleGroups.size === 1) {
      const [vehNo, items] = Array.from(vehicleGroups.entries())[0];
      const driverName = items[0]?.driverName;
      const counts = getProductCounts(items);
      const dispatchTime = formatTime(items[0]?.dispatchTime);

      // Routes summary
      const routes = Array.from(new Set(items.map(it => `${it.source} ➔ ${it.destination}`)));

      const lines = [
        `📋 *DISPATCH DETAILS - DRIVER*`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        `📅 *Date:* ${targetDate}`,
        dispatchTime ? `⏰ *Dispatch Time:* ${dispatchTime}` : null,
        `🚛 *Vehicle No:* ${vehNo}`,
        driverName ? `👤 *Driver:* ${driverName}` : null,
        ``,
        `📍 *ROUTE:*`,
        ...routes.map(r => `• ${r}`),
        ``,
        `📦 *CARGO LOAD:*`
      ];

      if (counts.standard > 0) lines.push(`• Standard: ${counts.standard} Boxes`);
      if (counts.premium > 0) lines.push(`• Premium: ${counts.premium} Boxes`);
      if (counts.alhaj > 0) lines.push(`• Alhaj: ${counts.alhaj} Boxes`);
      lines.push(`─────────────────────`);
      lines.push(`📦 *Total Load:* ${counts.total} Boxes`);
      lines.push(``);
      lines.push(`⚠️ *Note:* Please verify box count before departure and drive safely.`);

      return lines.filter(Boolean).join('\n');
    }

    // Multiple vehicles (All Drivers)
    const grandCounts = getProductCounts(vehicleFilteredTransfers);
    const lines = [
      `📋 *DISPATCH PLAN - ALL DRIVERS*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📅 *Date:* ${targetDate}`,
      `🚛 *Total Vehicles:* ${vehicleGroups.size}`,
      `📦 *Total Dispatches:* ${grandCounts.total} Boxes`,
      `━━━━━━━━━━━━━━━━━━━━━`
    ];

    let idx = 1;
    vehicleGroups.forEach((items, vehNo) => {
      const driver = items[0]?.driverName || 'Driver';
      const vehCounts = getProductCounts(items);
      const time = formatTime(items[0]?.dispatchTime);
      const routeStr = Array.from(new Set(items.map(it => `${it.source} ➔ ${it.destination}`))).join(', ');

      lines.push(``);
      lines.push(`${idx}️⃣ *Vehicle:* ${vehNo} (${driver})`);
      if (time) lines.push(`   ⏰ *Dispatch Time:* ${time}`);
      lines.push(`   📍 *Route:* ${routeStr}`);
      
      const itemDetails: string[] = [];
      if (vehCounts.standard > 0) itemDetails.push(`Standard: ${vehCounts.standard}`);
      if (vehCounts.premium > 0) itemDetails.push(`Premium: ${vehCounts.premium}`);
      if (vehCounts.alhaj > 0) itemDetails.push(`Alhaj: ${vehCounts.alhaj}`);

      lines.push(`   📦 *Cargo:* ${itemDetails.join(' | ')}`);
      lines.push(`   🔹 *Vehicle Total:* ${vehCounts.total} Boxes`);
      idx++;
    });

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⚠️ *Drivers:* Please verify physical box count before departure. Drive safely!`);

    return lines.join('\n');
  };

  // 2. GODOWN TEAM MESSAGE GENERATOR (NO DELIVERY TIME)
  const generateGodownMessage = (): string => {
    if (activeTransfers.length === 0) return 'No dispatch details available for godown team.';

    const godownFilteredTransfers = selectedGodown === 'all'
      ? activeTransfers
      : activeTransfers.filter(tr => tr.source === selectedGodown);

    if (godownFilteredTransfers.length === 0) return 'No dispatches found for selected godown.';

    const targetDate = formatDate(godownFilteredTransfers[0]?.date || defaultDate);
    const grandCounts = getProductCounts(godownFilteredTransfers);

    const lines = [
      `🏬 *GODOWN DISPATCH & LOADING PLAN*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📅 *Date:* ${targetDate}`,
      selectedGodown !== 'all' ? `📍 *Godown:* ${selectedGodown}` : `📍 *Scope:* All Godown Dispatches`,
      ``,
      `📊 *TOTAL LOADING SUMMARY:*`
    ];

    if (grandCounts.standard > 0) lines.push(`• Standard: ${grandCounts.standard} Boxes`);
    if (grandCounts.premium > 0) lines.push(`• Premium: ${grandCounts.premium} Boxes`);
    if (grandCounts.alhaj > 0) lines.push(`• Alhaj: ${grandCounts.alhaj} Boxes`);
    lines.push(`─────────────────────`);
    lines.push(`📦 *Grand Total: ${grandCounts.total} Boxes*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🚛 *VEHICLE LOADING SCHEDULE:*`);

    // Group by vehicle
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
      lines.push(`${vIdx}️⃣ *Vehicle:* ${vehNo} | *Driver:* ${driver}`);
      if (time) lines.push(`   ⏰ *Dispatch Time:* ${time}`);
      lines.push(`   📍 *Route:* ${sourceStr} ➔ ${destinationStr}`);

      const parts: string[] = [];
      if (vehCounts.standard > 0) parts.push(`Standard: ${vehCounts.standard}`);
      if (vehCounts.premium > 0) parts.push(`Premium: ${vehCounts.premium}`);
      if (vehCounts.alhaj > 0) parts.push(`Alhaj: ${vehCounts.alhaj}`);

      lines.push(`   📦 *Load Items:* ${parts.join(', ')}`);
      lines.push(`   🔹 *Vehicle Total:* ${vehCounts.total} Boxes`);
      vIdx++;
    });

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⚠️ *Godown In-Charge:* Please verify physical box count and batch condition with driver before gate release.`);

    return lines.join('\n');
  };

  // 3. PRODUCTION SUPERVISOR MESSAGE GENERATOR (NO DELIVERY TIME)
  const generateSupervisorMessage = (): string => {
    if (activeTransfers.length === 0) return 'No dispatch details available for production supervisor.';

    const targetDate = formatDate(activeTransfers[0]?.date || defaultDate);
    const grandCounts = getProductCounts(activeTransfers);

    const lines = [
      `👷 *PRODUCTION SUPERVISOR - DISPATCH PLAN*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📅 *Date:* ${targetDate}`,
      ``,
      `🎯 *PRODUCTION DISPATCH REQUIREMENT:*`
    ];

    if (grandCounts.standard > 0) lines.push(`• Standard: ${grandCounts.standard} Boxes`);
    if (grandCounts.premium > 0) lines.push(`• Premium: ${grandCounts.premium} Boxes`);
    if (grandCounts.alhaj > 0) lines.push(`• Alhaj: ${grandCounts.alhaj} Boxes`);
    lines.push(`─────────────────────`);
    lines.push(`📦 *TOTAL REQUIRED: ${grandCounts.total} Boxes*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🏢 *DESTINATION GODOWN ALLOCATION:*`);

    // Group by destination
    const destGroups = new Map<string, GodownTransfer[]>();
    activeTransfers.forEach(tr => {
      const list = destGroups.get(tr.destination) || [];
      list.push(tr);
      destGroups.set(tr.destination, list);
    });

    destGroups.forEach((items, destName) => {
      const destCounts = getProductCounts(items);
      const subParts: string[] = [];
      if (destCounts.standard > 0) subParts.push(`S: ${destCounts.standard}`);
      if (destCounts.premium > 0) subParts.push(`P: ${destCounts.premium}`);
      if (destCounts.alhaj > 0) subParts.push(`A: ${destCounts.alhaj}`);

      lines.push(`• *${destName}:* ${destCounts.total} Boxes (${subParts.join(' | ') || 'Mixed'})`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🚛 *SCHEDULED VEHICLES:*`);

    // Group by vehicle
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
      lines.push(`• ${vehNo} (${driver}) ➔ ${destName} [${vehTotal} Boxes]`);
    });

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⚠️ *Supervisor Note:* Ensure required production batches are ready and staged for vehicle loading on time.`);

    return lines.join('\n');
  };

  // Current active text based on selected tab
  const currentMessage = useMemo(() => {
    switch (activeTab) {
      case 'driver':
        return generateDriverMessage();
      case 'godown':
        return generateGodownMessage();
      case 'supervisor':
        return generateSupervisorMessage();
      default:
        return '';
    }
  }, [activeTab, scope, selectedVehicle, selectedGodown, activeTransfers, selectedTransfer]);

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
        className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <WhatsAppIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                WhatsApp Dispatch Share
              </h2>
              <p className="text-xs text-muted-foreground">
                Formatted dispatch plan for Drivers, Godown Team, and Production Supervisors
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Scope Selector if opened from a specific transfer */}
          {selectedTransfer && (
            <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-lg border text-xs">
              <span className="text-muted-foreground px-2 font-medium">Scope:</span>
              <button
                type="button"
                onClick={() => setScope('selected')}
                className={`flex-1 py-1 px-2.5 rounded-md font-semibold transition-all ${
                  scope === 'selected'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Selected Dispatch ({selectedTransfer.vehicleNumber} • {selectedTransfer.quantity} Boxes)
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex-1 py-1 px-2.5 rounded-md font-semibold transition-all ${
                  scope === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Dispatches ({transfers.filter(t => t.status !== 'Cancelled').length} entries)
              </button>
            </div>
          )}

          {/* Role Navigation Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-muted/60 rounded-xl border">
            <button
              type="button"
              onClick={() => setActiveTab('driver')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'driver'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="w-4 h-4 text-blue-500" />
              <span>Driver</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('godown')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'godown'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Warehouse className="w-4 h-4 text-emerald-500" />
              <span>Godown Team</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supervisor')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'supervisor'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <HardHat className="w-4 h-4 text-amber-500" />
              <span>Supervisor</span>
            </button>
          </div>

          {/* Role-Specific Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-muted/20 p-3 rounded-xl border">
            {activeTab === 'driver' && scope === 'all' && (
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Select Vehicle:
                </label>
                <select
                  value={selectedVehicle}
                  onChange={e => setSelectedVehicle(e.target.value)}
                  className="bg-background border rounded-lg px-2.5 py-1.5 text-xs font-medium w-full max-w-[240px] outline-none focus:ring-1 focus:ring-primary"
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

            {activeTab === 'godown' && scope === 'all' && (
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Source Godown:
                </label>
                <select
                  value={selectedGodown}
                  onChange={e => setSelectedGodown(e.target.value)}
                  className="bg-background border rounded-lg px-2.5 py-1.5 text-xs font-medium w-full max-w-[240px] outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Godowns</option>
                  {uniqueGodowns.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'supervisor' && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Production requirements consolidated for all active dispatches</span>
              </div>
            )}

            {/* Optional Phone Number Input */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Phone (optional, e.g. 9198...)"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="bg-background border rounded-lg px-2.5 py-1.5 text-xs w-full sm:w-48 outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* WhatsApp Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                WhatsApp Message Preview
              </span>
              <span className="text-[11px] opacity-75">Ready to send</span>
            </div>

            <div className="relative rounded-xl border border-emerald-500/20 bg-emerald-950/5 dark:bg-emerald-950/20 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto select-text shadow-inner">
              {currentMessage}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
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
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current" />
              <span>Share on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
