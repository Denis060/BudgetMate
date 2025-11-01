import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Play,
  Clock,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface ImportJob {
  jobId: string;
  status: 'pending' | 'configured' | 'processing' | 'completed' | 'failed';
  filename: string;
  totalRows: number;
  processedRows?: number;
  successfulRows?: number;
  failedRows?: number;
  createdAt: string;
  completedAt?: string;
}

interface ColumnSuggestions {
  date: string[];
  amount: string[];
  description: string[];
  type: string[];
  category: string[];
  account: string[];
  reference: string[];
}

interface MappingPreview {
  row_number: number;
  date: string;
  amount: number;
  description: string;
  type: string;
  category?: string;
  account?: string;
  reference?: string;
  validation: {
    valid: boolean;
    errors: string[];
  };
}

export default function Import() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'processing'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<ColumnSuggestions | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<MappingPreview[]>([]);
  const [previewSummary, setPreviewSummary] = useState<{total: number, valid: number, invalid: number} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadedFile(file);
      setImportJob({
        jobId: response.data.jobId,
        status: 'pending',
        filename: file.name,
        totalRows: response.data.totalRows,
        createdAt: new Date().toISOString(),
      });
      setHeaders(response.data.headers);
      setSuggestions(response.data.suggestions);
      
      // Auto-map based on suggestions
      const autoMapping: Record<string, string> = {};
      Object.entries(response.data.suggestions).forEach(([field, suggestions]) => {
        if (suggestions.length > 0) {
          autoMapping[field] = suggestions[0];
        }
      });
      setMapping(autoMapping);
      
      setCurrentStep('mapping');
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const configureMapping = async () => {
    if (!importJob) return;

    try {
      await api.put(`/import/${importJob.jobId}/mapping`, mapping);
      
      // Get preview
      const previewResponse = await api.get(`/import/${importJob.jobId}/preview`);
      setPreview(previewResponse.data.preview);
      setPreviewSummary(previewResponse.data.summary);
      setCurrentStep('preview');
      toast.success('Mapping configured successfully!');
    } catch (error) {
      console.error('Mapping error:', error);
      toast.error('Failed to configure mapping');
    }
  };

  const startProcessing = async () => {
    if (!importJob) return;

    setIsProcessing(true);
    try {
      await api.post(`/import/${importJob.jobId}/process`);
      setCurrentStep('processing');
      toast.success('Import started!');
      
      // Poll for status updates
      pollImportStatus();
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to start import');
      setIsProcessing(false);
    }
  };

  const pollImportStatus = async () => {
    if (!importJob) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/import/${importJob.jobId}/status`);
        const status = response.data;
        
        setImportJob(prev => prev ? { ...prev, ...status } : null);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
          
          if (status.status === 'completed') {
            toast.success(`Import completed! ${status.successfulRows} transactions imported`);
          } else {
            toast.error('Import failed');
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
        clearInterval(interval);
        setIsProcessing(false);
      }
    }, 2000);
  };

  const resetImport = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setImportJob(null);
    setHeaders([]);
    setSuggestions(null);
    setMapping({});
    setPreview([]);
    setPreviewSummary(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Import Transactions</h1>
      
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['upload', 'mapping', 'preview', 'processing'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep === step ? 'bg-blue-600 text-white' : 
                ['upload', 'mapping', 'preview'].indexOf(currentStep) > index ? 'bg-green-600 text-white' : 
                'bg-gray-200 text-gray-600'}`}>
              {['upload', 'mapping', 'preview'].indexOf(currentStep) > index ? 
                <CheckCircle className="w-4 h-4" /> : index + 1}
            </div>
            {index < 3 && (
              <div className={`w-16 h-1 mx-2 
                ${['upload', 'mapping', 'preview'].indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {currentStep === 'upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your CSV file here, or click to browse
            </p>
            <p className="text-gray-600 mb-4">
              Supports bank exports, transaction logs, and SMS transaction data
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Supported formats:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Bank CSV exports (date, amount, description)</li>
              <li>SMS transaction logs</li>
              <li>Personal expense tracking sheets</li>
              <li>Mobile money transaction histories</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {currentStep === 'mapping' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Map Columns</h2>
          <p className="text-gray-600 mb-6">
            Map your CSV columns to BudgetMate fields. We've made some suggestions based on your column names.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries({
              date: 'Transaction Date',
              amount: 'Amount',
              description: 'Description',
              type: 'Type (Optional)',
              category: 'Category (Optional)',
              account: 'Account (Optional)',
              reference: 'Reference (Optional)',
            }).map(([field, label]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label} {field === 'date' || field === 'amount' || field === 'description' ? '*' : ''}
                </label>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select column...</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                {suggestions?.[field as keyof ColumnSuggestions]?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: {suggestions[field as keyof ColumnSuggestions].join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-6">
            <button
              onClick={resetImport}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={configureMapping}
              disabled={!mapping.date || !mapping.amount || !mapping.description}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Preview Import
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {currentStep === 'preview' && previewSummary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Preview Import</h2>
          
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{previewSummary.total}</div>
              <div className="text-sm text-blue-600">Total Rows</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{previewSummary.valid}</div>
              <div className="text-sm text-green-600">Valid Rows</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{previewSummary.invalid}</div>
              <div className="text-sm text-red-600">Invalid Rows</div>
            </div>
          </div>
          
          {/* Preview Table */}
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((row, index) => (
                  <tr key={index} className={row.validation.valid ? '' : 'bg-red-50'}>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.row_number}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.date}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.amount}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.description}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.type}</td>
                    <td className="px-4 py-2 text-sm">
                      {row.validation.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('mapping')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Mapping
            </button>
            <button
              onClick={startProcessing}
              disabled={previewSummary.valid === 0}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Import {previewSummary.valid} Transactions
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Processing */}
      {currentStep === 'processing' && importJob && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Import Status</h2>
          
          <div className="text-center py-8">
            {importJob.status === 'processing' ? (
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            ) : importJob.status === 'completed' ? (
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            )}
            
            <h3 className="text-lg font-medium mb-2">
              {importJob.status === 'processing' && 'Processing Import...'}
              {importJob.status === 'completed' && 'Import Completed!'}
              {importJob.status === 'failed' && 'Import Failed'}
            </h3>
            
            {importJob.processedRows !== undefined && (
              <div className="bg-gray-100 rounded-lg p-4 max-w-md mx-auto">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-600">{importJob.processedRows}</div>
                    <div className="text-gray-600">Processed</div>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">{importJob.successfulRows || 0}</div>
                    <div className="text-gray-600">Success</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{importJob.failedRows || 0}</div>
                    <div className="text-gray-600">Failed</div>
                  </div>
                </div>
              </div>
            )}
            
            {importJob.status === 'completed' && (
              <button
                onClick={resetImport}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Import Another File
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}