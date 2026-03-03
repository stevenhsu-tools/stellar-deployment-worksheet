import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Camera, Info, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

const scoringData = {
  d: {
    title: 'Deployment Type (D)',
    options: [
      { label: 'Manual, ad-hoc', score: 1 },
      { label: 'Manual, documented process', score: 2 },
      { label: 'SCCM / automation, limited batching', score: 3 },
      { label: 'SCCM / automation with aligned maintenance', score: 4 },
    ],
  },
  g: {
    title: 'Governance / HQ Audit (G)',
    options: [
      { label: 'No HQ audit or reporting', score: 0 },
      { label: 'Informal or irregular review', score: 1 },
      { label: 'Regular HQ review', score: 3 },
      { label: 'Formal audit with targets and accountability', score: 4 },
    ],
  },
  m: {
    title: 'Manpower Allocation (M)',
    options: [
      { label: 'Single owner, not aligned to maintenance', score: 1 },
      { label: 'Single owner, aligned', score: 2 },
      { label: 'Multi-person team, partial alignment', score: 3 },
      { label: 'Multi-person team, fully aligned', score: 4 },
    ],
  },
  p: {
    title: 'Partner Involvement (P)',
    options: [
      { label: 'No partner', score: 0 },
      { label: 'Ad-hoc partner support', score: 1 },
      { label: 'Dedicated deployment partner', score: 3 },
      { label: 'Partner with SLA and scale mandate', score: 4 },
    ],
  },
};

const outcomeRanges = [
  { min: 0, max: 5, rate: '20–30%', seats: '300–600', maxMonthly: 600 },
  { min: 6, max: 9, rate: '30–50%', seats: '600–1,200', maxMonthly: 1200 },
  { min: 10, max: 12, rate: '60–75%', seats: '1,500–3,000', maxMonthly: 3000 },
  { min: 13, max: 16, rate: '75–85%', seats: '4,000–6,000+', maxMonthly: 6000 },
];

export default function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!contentRef.current) return;
    
    setIsPrinting(true);
    
    // Wait for React to re-render with printing styles
    await new Promise(resolve => setTimeout(resolve, 800));

    const element = contentRef.current;
    const name = customerName || 'Draft';

    try {
      console.log('Starting PDF generation...');
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
        pixelRatio: 1.5, // Slightly lower for better reliability
        cacheBust: true,
      });

      console.log('Image generated, creating PDF...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2);
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const imgHeight = (img.height * imgWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }

      pdf.save(`Stellar_Deployment_Worksheet_${name}.pdf`);
      console.log('PDF saved successfully.');
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert(`PDF generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear all inputs?')) {
      setCustomerName('');
      setSitesRegions('');
      setTotalAgentCount('');
      setLicensedSeats('');
      setDeployedSeats('');
      setLogoSrc(null);
      setScores({ d: -1, g: -1, m: -1, p: -1 });
    }
  };

  const [customerName, setCustomerName] = useState('');
  const [sitesRegions, setSitesRegions] = useState('');
  const [totalAgentCount, setTotalAgentCount] = useState('');
  const [licensedSeats, setLicensedSeats] = useState('');
  const [deployedSeats, setDeployedSeats] = useState('');
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [scores, setScores] = useState({ d: -1, g: -1, m: -1, p: -1 });
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString());
  }, []);

  const formatNumberInput = (value: string) => {
    const rawValue = value.replace(/,/g, '').replace(/\D/g, '');
    if (rawValue) {
      return parseInt(rawValue, 10).toLocaleString('en-US');
    }
    return '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateRate = () => {
    const licensed = parseFloat(licensedSeats.replace(/,/g, '')) || 0;
    const deployed = parseFloat(deployedSeats.replace(/,/g, '')) || 0;
    let rate = 0;
    if (licensed > 0) {
      rate = (deployed / licensed) * 100;
    }
    return Number.isInteger(rate) ? rate : rate.toFixed(1);
  };

  const getVal = (v: number) => (v === -1 ? 0 : v);
  const totalEci = getVal(scores.d) + getVal(scores.g) + getVal(scores.m) + getVal(scores.p);
  const outcome = outcomeRanges.find((r) => totalEci >= r.min && totalEci <= r.max) || outcomeRanges[0];
  const annual = (outcome.maxMonthly * 12).toLocaleString('en-US');
  const outcomeAnnual = outcome.seats.includes('+') ? `${annual}+` : annual;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 text-slate-800 font-sans">
      {/* Control Bar */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <FileText className="text-blue-600 w-6 h-6" />
          Stellar Deployment Worksheet
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors bg-white hover:bg-gray-50 text-slate-600 border border-gray-300 shadow-sm cursor-pointer"
          >
            Reset
          </button>
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Main Worksheet Area */}
      <div
        ref={contentRef}
        className={`max-w-[185mm] mx-auto bg-white shadow-lg p-8 min-h-[297mm] relative ${isPrinting ? 'is-printing' : ''}`}
        style={{ width: '185mm' }}
      >
        <style>
          {`
            /* Fix for oklch colors in PDF generation */
            .is-printing {
              --slate-800: #1e293b;
              --slate-700: #334155;
              --slate-600: #475569;
              --slate-500: #64748b;
              --slate-400: #94a3b8;
              --slate-300: #cbd5e1;
              --slate-200: #e2e8f0;
              --slate-100: #f1f5f9;
              --blue-800: #1e40af;
              --blue-700: #1d4ed8;
              --blue-600: #2563eb;
              --blue-500: #3b82f6;
              --blue-100: #dbeafe;
              --blue-50: #eff6ff;
              --gray-400: #9ca3af;
              --gray-300: #d1d5db;
              --gray-200: #e5e7eb;
              --gray-50: #f9fafb;
            }
            
            .is-printing .input-ui-only { display: none !important; }
            .is-printing { border: none !important; box-shadow: none !important; margin: 0 !important; font-size: 12px; background: white !important; }
            .is-printing * { box-sizing: border-box !important; box-shadow: none !important; text-shadow: none !important; transition: none !important; animation: none !important; }
            .is-printing input { border-bottom: 1px solid var(--slate-300) !important; background: transparent !important; border-top: none !important; border-left: none !important; border-right: none !important; border-radius: 0 !important; padding: 2px 4px !important; }
            .is-printing input::placeholder { color: transparent !important; }
            .is-printing select { appearance: none !important; -webkit-appearance: none !important; border: 1px solid var(--gray-300) !important; background: white !important; }
            
            /* Color Overrides */
            .is-printing .border-slate-800 { border-color: var(--slate-800) !important; }
            .is-printing .bg-slate-800 { background-color: var(--slate-800) !important; }
            .is-printing .text-slate-800 { color: var(--slate-800) !important; }
            .is-printing .text-slate-700 { color: var(--slate-700) !important; }
            .is-printing .text-slate-600 { color: var(--slate-600) !important; }
            .is-printing .text-slate-500 { color: var(--slate-500) !important; }
            .is-printing .text-slate-400 { color: var(--slate-400) !important; }
            .is-printing .border-slate-300 { border-color: var(--slate-300) !important; }
            .is-printing .bg-slate-200 { background-color: var(--slate-200) !important; }
            .is-printing .border-slate-200 { border-color: var(--slate-200) !important; }
            .is-printing .bg-slate-100 { background-color: var(--slate-100) !important; }
            
            .is-printing .text-blue-800 { color: var(--blue-800) !important; }
            .is-printing .text-blue-700 { color: var(--blue-700) !important; }
            .is-printing .text-blue-600 { color: var(--blue-600) !important; }
            .is-printing .border-blue-600 { border-color: var(--blue-600) !important; }
            .is-printing .bg-blue-600 { background-color: var(--blue-600) !important; }
            .is-printing .bg-blue-500 { background-color: var(--blue-500) !important; }
            .is-printing .bg-blue-100 { background-color: var(--blue-100) !important; }
            .is-printing .bg-blue-50 { background-color: var(--blue-50) !important; }
            
            .is-printing .border-gray-300 { border-color: var(--gray-300) !important; }
            .is-printing .text-gray-400 { color: var(--gray-400) !important; }
            .is-printing .bg-gray-50 { background-color: var(--gray-50) !important; }
            .is-printing .bg-gray-100 { background-color: #f3f4f6 !important; }
            .is-printing .border-gray-200 { border-color: var(--gray-200) !important; }
            .is-printing .bg-white { background-color: #ffffff !important; }
            .is-printing .text-white { color: #ffffff !important; }
            
            /* Specific layout fixes for printing */
            .is-printing .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .is-printing [class*="md:grid-cols-"] { grid-template-columns: 0.7fr 1.3fr 1.5fr !important; }
            .is-printing .flex-row { flex-direction: row !important; }
            .is-printing .gap-6 { gap: 1.5rem !important; }
            .is-printing .gap-4 { gap: 1rem !important; }
            .is-printing .gap-3 { gap: 0.75rem !important; }
            .is-printing .p-8 { padding: 1.5rem !important; }
            .is-printing .mb-8 { margin-bottom: 1.5rem !important; }
            .is-printing .mt-12 { margin-top: 2rem !important; }
            
            .html2pdf__page-break { page-break-before: always; height: 1rem; display: block; }
          `}
        </style>

        {/* Header */}
        <div className="border-b-4 border-slate-800 mb-8 pb-4">
          <h1 className="text-3xl font-extrabold text-slate-800 uppercase tracking-tighter">Stellar Deployment</h1>
          <p className="text-slate-500 text-lg">Execution Capacity Worksheet</p>
        </div>

        {/* SECTION A: DEPLOYMENT GOAL */}
        <div className="bg-slate-800 text-white p-1 mb-2 mt-4 rounded-sm">
          <h3 className="font-bold text-sm uppercase tracking-wide">Section A. Deployment Goal</h3>
        </div>

        <div className="flex flex-row gap-6 mb-8">
          {/* Logo Area */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className="border-2 border-dashed border-gray-300 flex items-center justify-center relative bg-gray-50 overflow-hidden group"
              style={{ width: '3cm', height: '3cm' }}
            >
              {logoSrc ? (
                <img src={logoSrc} alt="Customer Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="text-xs text-gray-400 text-center px-1">
                  Logo Area<br />3cm x 3cm
                </div>
              )}

              {/* Overlay for upload */}
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer input-ui-only">
                <Camera className="text-white w-6 h-6" />
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Input Fields */}
          <div className="flex-grow grid grid-cols-1 gap-4 content-center">
            <div className="flex items-baseline">
              <label className="font-semibold w-40 text-sm">Customer Name:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-grow border-b-2 border-slate-300 px-2 py-1 focus:outline-none focus:border-blue-600 bg-transparent placeholder-slate-300 text-sm"
                placeholder="Enter Customer Name"
              />
            </div>
            <div className="flex items-baseline">
              <label className="font-semibold w-40 text-sm">Sites / Regions:</label>
              <input
                type="text"
                value={sitesRegions}
                onChange={(e) => setSitesRegions(e.target.value)}
                className="flex-grow border-b-2 border-slate-300 px-2 py-1 focus:outline-none focus:border-blue-600 bg-transparent placeholder-slate-300 text-sm"
                placeholder="e.g. NA, EMEA, APAC"
              />
            </div>
            <div className="flex items-baseline">
              <div className="w-40 flex items-center">
                <label className="font-semibold text-sm mr-1">Total Agent Count:</label>
                <div title="How many agents do you want to deploy in total?" className="cursor-help">
                  <Info className="text-slate-400 w-4 h-4" />
                </div>
              </div>
              <input
                type="text"
                value={totalAgentCount}
                onChange={(e) => setTotalAgentCount(formatNumberInput(e.target.value))}
                className="flex-grow border-b-2 border-slate-300 px-2 py-1 focus:outline-none focus:border-blue-600 bg-transparent placeholder-slate-300 text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* SECTION B: CURRENT DEPLOYMENT BASELINE */}
        <div className="bg-slate-800 text-white p-1 mb-2 mt-4 rounded-sm">
          <h3 className="font-bold text-sm uppercase tracking-wide">Section B. Current Deployment Baseline</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="flex items-baseline">
            <label className="font-semibold w-48 text-sm">Total Licensed Seats:</label>
            <input
              type="text"
              value={licensedSeats}
              onChange={(e) => setLicensedSeats(formatNumberInput(e.target.value))}
              className="flex-grow border-b-2 border-slate-300 px-2 py-1 focus:outline-none focus:border-blue-600 bg-transparent placeholder-slate-300 text-sm"
              placeholder="0"
            />
          </div>
          <div className="flex items-baseline">
            <label className="font-semibold w-48 text-sm">Current Deployed Seats:</label>
            <input
              type="text"
              value={deployedSeats}
              onChange={(e) => setDeployedSeats(formatNumberInput(e.target.value))}
              className="flex-grow border-b-2 border-slate-300 px-2 py-1 focus:outline-none focus:border-blue-600 bg-transparent placeholder-slate-300 text-sm"
              placeholder="0"
            />
          </div>
          <div className="flex items-baseline">
            <label className="font-semibold w-48 text-sm">Current Deployment Rate:</label>
            <div className="flex-grow border-b-2 border-slate-300 px-2 py-1 bg-gray-50 text-blue-700 font-bold text-sm">
              {calculateRate()}%
            </div>
          </div>
        </div>

        {/* Section C */}
        <div className="bg-slate-800 text-white p-1 mb-2 mt-4 rounded-sm">
          <h3 className="font-bold text-sm uppercase tracking-wide">Section C. Execution Scoring</h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(scoringData) as Array<keyof typeof scoringData>).map((key) => {
            const section = scoringData[key];
            const scoreValue = scores[key];

            return (
              <div key={key} className="bg-gray-50 p-2 rounded border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-sm text-slate-700">{section.title}</h4>
                  <div className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Score: <span>{scoreValue === -1 ? '-' : scoreValue}</span>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={scoreValue}
                    onChange={(e) => setScores({ ...scores, [key]: parseInt(e.target.value, 10) })}
                    className="w-full appearance-none bg-white border border-gray-300 text-slate-700 py-1 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer text-sm"
                  >
                    <option value={-1} disabled>
                      Select a condition...
                    </option>
                    {section.options.map((opt) => (
                      <option key={opt.score} value={opt.score}>
                        {opt.label} (Score: {opt.score})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 input-ui-only">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section D */}
        <div className="bg-slate-800 text-white p-1 mb-2 mt-4 rounded-sm">
          <h3 className="font-bold text-sm uppercase tracking-wide">Section D. Execution Capacity Index (ECI)</h3>
        </div>

        <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
          <div className="text-slate-600">
            <p className="font-mono text-xs mb-1">Formula:</p>
            <p className="text-base font-medium italic">ECI = D + G + M + P</p>
            <p className="text-xs text-slate-500 mt-1">
              Calculation: {getVal(scores.d)} + {getVal(scores.g)} + {getVal(scores.m)} + {getVal(scores.p)}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold uppercase text-slate-500">Total ECI</span>
            <div className="flex items-baseline">
              <span className="text-3xl font-extrabold text-blue-700">{totalEci}</span>
              <span className="text-lg text-slate-400 font-medium ml-1">/ 16</span>
            </div>
          </div>
        </div>

        {/* Page Break for PDF */}
        <div className="html2pdf__page-break"></div>

        {/* Section E */}
        <div className="bg-slate-800 text-white p-1 mb-2 mt-4 rounded-sm">
          <h3 className="font-bold text-sm uppercase tracking-wide">Section E. Expected Outcomes</h3>
        </div>

        <div className="mb-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-200 text-slate-700">
                <th className="p-1 border border-slate-300 text-left">ECI Range</th>
                <th className="p-1 border-slate-300 text-left">Expected Deployment Rate</th>
                <th className="p-1 border-slate-300 text-left">Monthly Deployment Seats</th>
              </tr>
            </thead>
            <tbody>
              {outcomeRanges.map((range, idx) => {
                const isActive = totalEci >= range.min && totalEci <= range.max;
                const activeClass = isActive ? 'font-bold text-blue-700' : 'text-slate-600';
                const rowClass = isActive ? 'bg-blue-50' : 'bg-white';

                return (
                  <tr key={idx} className={rowClass}>
                    <td className={`p-1 border border-slate-300 ${activeClass}`}>
                      {range.min}–{range.max}
                    </td>
                    <td className={`p-1 border border-slate-300 ${activeClass}`}>{range.rate}</td>
                    <td className={`p-1 border border-slate-300 ${activeClass}`}>{range.seats}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white border-2 border-slate-800 p-3 rounded relative">
          <h4 className="font-bold text-base mb-2 text-slate-800 border-b border-slate-200 pb-1">Expected Outcome</h4>

          <div className="grid grid-cols-1 md:grid-cols-[0.7fr_1.3fr_1.5fr] gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-1 whitespace-nowrap">
                Deployment Rate
              </span>
              <div className="text-xl font-bold text-blue-700 border-b-2 border-slate-300 pb-1">
                {outcome.rate}
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-1 whitespace-nowrap">
                Monthly Deployment Seats
              </span>
              <div className="text-xl font-bold text-blue-700 border-b-2 border-slate-300 pb-1">
                {outcome.seats}
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-1 whitespace-nowrap">
                Recommended Annual Seats
              </span>
              <div className="text-xl font-bold text-blue-700 border-b-2 border-slate-300 pb-1">
                {outcomeAnnual}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-400">
          <p>Stellar Deployment Worksheet • Generated on <span>{currentDate}</span></p>
        </div>
      </div>
    </div>
  );
}
