import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, X, Download, Play, RefreshCw } from 'lucide-react';
import { warehouseApi } from '../services/warehouseApi';
import { useRealtimeSync, SHARED_SESSION_ID } from '../hooks/useRealtimeSync';
import { supabase } from '../services/supabase';

interface CsvBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvBulkImportModal: React.FC<CsvBulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedIds, setParsedIds] = useState<number[]>([]);
  const [invalidEntries, setInvalidEntries] = useState<string[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{
    total: number;
    valid: number;
    duplicates: number;
    invalid: number;
    executionTimeMs: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logActivity } = useRealtimeSync();

  if (!isOpen) return null;

  const downloadSampleTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,package_id\n1\n3\n7\n2\n6\n10\n500000000\n1000000000';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_packages_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) parseFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) parseFile(dropped);
  };

  const parseFile = (f: File) => {
    setFile(f);
    setSummary(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/);
      const valids: number[] = [];
      const invalids: string[] = [];
      const seen = new Set<number>();
      const dupes: number[] = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (idx === 0 && (trimmed.toLowerCase().includes('package') || trimmed.toLowerCase().includes('id'))) {
          return; // skip header
        }

        const num = Number(trimmed);
        if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > 1000000000) {
          invalids.push(`Line ${idx + 1}: "${trimmed}"`);
        } else if (seen.has(num)) {
          dupes.push(num);
        } else {
          seen.add(num);
          valids.push(num);
        }
      });

      setParsedIds(valids);
      setInvalidEntries(invalids);
      setDuplicateIds(dupes);
    };

    reader.readAsText(f);
  };

  const handleExecuteImport = async () => {
    if (parsedIds.length === 0) return;
    setIsProcessing(true);
    setProgress(10);

    const tStart = performance.now();
    const batchSize = 1000;
    let added = 0;

    for (let i = 0; i < parsedIds.length; i += batchSize) {
      const slice = parsedIds.slice(i, i + batchSize);
      const res = await warehouseApi.addBatch(slice);
      if (res.success) added += res.unique_added;
      setProgress(Math.round(((i + slice.length) / parsedIds.length) * 100));
    }

    const tEnd = performance.now();
    const execTime = Math.round(tEnd - tStart);

    setSummary({
      total: parsedIds.length + invalidEntries.length + duplicateIds.length,
      valid: added,
      duplicates: duplicateIds.length + (parsedIds.length - added),
      invalid: invalidEntries.length,
      executionTimeMs: execTime
    });

    // Record bulk import in Supabase
    try {
      await supabase.from('bulk_import_jobs').insert([{
        session_id: SHARED_SESSION_ID,
        filename: file?.name || 'bulk_upload.csv',
        total_records: parsedIds.length,
        valid_records: added,
        duplicates_skipped: duplicateIds.length,
        invalid_records: invalidEntries.length,
        status: 'COMPLETED'
      }]);
    } catch (e) {}

    await logActivity('BATCH_IMPORT', null, { count: added, filename: file?.name });
    setIsProcessing(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl p-6 max-w-xl w-full space-y-5 shadow-2xl font-mono text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-text flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" /> Bulk Package Ingestion
            </h3>
            <p className="text-muted text-[11px]">Upload CSV/XLSX files with package IDs up to 10⁹.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        {!summary ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition bg-background"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileText className="w-8 h-8 text-primary/60 mx-auto mb-2" />
            <p className="font-bold text-text mb-1">
              {file ? file.name : 'Click to select or drag & drop CSV file'}
            </p>
            <p className="text-[11px] text-muted">Supports single column format with header `package_id`</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadSampleTemplate();
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-primary hover:underline text-[11px] font-bold"
            >
              <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
            </button>
          </div>
        ) : (
          /* Completion Summary */
          <div className="p-4 bg-background border border-received/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-received text-sm">
              <CheckCircle2 className="w-4 h-4" /> Bulk Import Successfully Completed
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-surface border border-border rounded">
                <span className="text-muted text-[10px] block">TOTAL ROWS</span>
                <span className="font-bold text-text">{summary.total}</span>
              </div>
              <div className="p-2 bg-surface border border-border rounded">
                <span className="text-received text-[10px] block">VALID INGESTED</span>
                <span className="font-bold text-received">{summary.valid}</span>
              </div>
              <div className="p-2 bg-surface border border-border rounded">
                <span className="text-missing text-[10px] block">DUPLICATES</span>
                <span className="font-bold text-missing">{summary.duplicates}</span>
              </div>
              <div className="p-2 bg-surface border border-border rounded">
                <span className="text-muted text-[10px] block">EXECUTION TIME</span>
                <span className="font-bold text-text">{summary.executionTimeMs}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Preview Strip */}
        {file && !summary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-text">Data Validation Preview:</span>
              <span className="text-muted">
                {parsedIds.length} Valid • {duplicateIds.length} Duplicates • {invalidEntries.length} Invalid
              </span>
            </div>

            {/* Invalid rows alert */}
            {invalidEntries.length > 0 && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-[11px] max-h-20 overflow-y-auto">
                <div className="font-bold flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Skipped Invalid Entries:
                </div>
                {invalidEntries.slice(0, 5).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {invalidEntries.length > 5 && <div>...and {invalidEntries.length - 5} more</div>}
              </div>
            )}

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted">
                  <span>Processing through C AVL Engine...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-primary transition-all duration-300"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded bg-surface hover:bg-background text-text transition"
          >
            {summary ? 'Close' : 'Cancel'}
          </button>
          {!summary && (
            <button
              onClick={handleExecuteImport}
              disabled={isProcessing || parsedIds.length === 0}
              className="px-5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" /> Confirm & Ingest ({parsedIds.length} IDs)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
