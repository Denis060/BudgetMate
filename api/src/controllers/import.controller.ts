import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import crypto from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Column mapping schema
const columnMappingSchema = z.object({
  date: z.string(),
  amount: z.string(),
  description: z.string(),
  type: z.string().optional(),
  category: z.string().optional(),
  account: z.string().optional(),
  reference: z.string().optional(),
});

// Helper function to generate idempotency key
function generateIdempotencyKey(row: any, mapping: any): string {
  const keyFields = [
    row[mapping.date],
    row[mapping.amount],
    row[mapping.description],
    row[mapping.reference] || '',
  ];
  return crypto.createHash('md5').update(keyFields.join('|')).digest('hex');
}

// Helper function to parse CSV data
function parseCSVData(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper function to detect column types
function detectColumns(data: any[]): { suggestions: Record<string, string[]>, sample: any } {
  if (data.length === 0) return { suggestions: {}, sample: {} };
  
  const headers = Object.keys(data[0]);
  const suggestions: Record<string, string[]> = {
    date: [],
    amount: [],
    description: [],
    type: [],
    category: [],
    account: [],
    reference: [],
  };

  // Simple heuristics for column detection
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
      suggestions.date.push(header);
    }
    if (lowerHeader.includes('amount') || lowerHeader.includes('value') || lowerHeader.includes('sum')) {
      suggestions.amount.push(header);
    }
    if (lowerHeader.includes('desc') || lowerHeader.includes('detail') || lowerHeader.includes('memo')) {
      suggestions.description.push(header);
    }
    if (lowerHeader.includes('type') || lowerHeader.includes('transaction_type')) {
      suggestions.type.push(header);
    }
    if (lowerHeader.includes('category')) {
      suggestions.category.push(header);
    }
    if (lowerHeader.includes('account')) {
      suggestions.account.push(header);
    }
    if (lowerHeader.includes('ref') || lowerHeader.includes('id')) {
      suggestions.reference.push(header);
    }
  });

  return {
    suggestions,
    sample: data[0],
  };
}

// Upload and analyze CSV file
export const uploadCSV = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = (req as any).user.userId;
      const csvData = await parseCSVData(req.file.buffer);
      
      if (csvData.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      // Create import job
      const importJob = await prisma.import_jobs.create({
        data: {
          user_id: userId,
          filename: req.file.originalname,
          file_size: req.file.size,
          total_rows: csvData.length,
          status: 'pending',
          preview_data: csvData.slice(0, 5), // First 5 rows for preview
        },
      });

      // Detect columns and provide suggestions
      const columnAnalysis = detectColumns(csvData);

      res.json({
        jobId: importJob.id,
        totalRows: csvData.length,
        headers: Object.keys(csvData[0]),
        preview: csvData.slice(0, 5),
        suggestions: columnAnalysis.suggestions,
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: 'Failed to process CSV file' });
    }
  },
];

// Configure column mapping
export const configureMapping = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mapping = columnMappingSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify job ownership
    const importJob = await prisma.import_jobs.findFirst({
      where: { id: jobId, user_id: userId },
    });

    if (!importJob) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    // Update job with mapping configuration
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        mapping_data: mapping,
        status: 'configured',
      },
    });

    res.json({ message: 'Column mapping configured successfully' });
  } catch (error) {
    console.error('Mapping configuration error:', error);
    res.status(500).json({ error: 'Failed to configure mapping' });
  }
};

// Preview mapped data
export const previewMapping = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user.userId;

    const importJob = await prisma.import_jobs.findFirst({
      where: { id: jobId, user_id: userId },
    });

    if (!importJob || !importJob.mapping_data || !importJob.preview_data) {
      return res.status(404).json({ error: 'Import job or mapping not found' });
    }

    const mapping = importJob.mapping_data as any;
    const previewData = importJob.preview_data as any[];

    // Apply mapping to preview data
    const mappedPreview = previewData.map((row, index) => {
      try {
        const mappedRow = {
          row_number: index + 1,
          date: row[mapping.date],
          amount: parseFloat(row[mapping.amount]?.replace(/[^\d.-]/g, '') || '0'),
          description: row[mapping.description],
          type: row[mapping.type] || 'expense',
          category: row[mapping.category] || null,
          account: row[mapping.account] || null,
          reference: row[mapping.reference] || null,
          idempotency_key: generateIdempotencyKey(row, mapping),
        };

        return {
          ...mappedRow,
          validation: {
            valid: !isNaN(mappedRow.amount) && mappedRow.date && mappedRow.description,
            errors: [],
          },
        };
      } catch (error) {
        return {
          row_number: index + 1,
          error: 'Failed to parse row',
          validation: { valid: false, errors: ['Parse error'] },
        };
      }
    });

    res.json({
      jobId,
      preview: mappedPreview,
      summary: {
        total: mappedPreview.length,
        valid: mappedPreview.filter(row => row.validation?.valid).length,
        invalid: mappedPreview.filter(row => !row.validation?.valid).length,
      },
    });
  } catch (error) {
    console.error('Preview mapping error:', error);
    res.status(500).json({ error: 'Failed to preview mapping' });
  }
};

// Process import job
export const processImport = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user.userId;

    const importJob = await prisma.import_jobs.findFirst({
      where: { id: jobId, user_id: userId },
    });

    if (!importJob || !importJob.mapping_data) {
      return res.status(404).json({ error: 'Import job or mapping not found' });
    }

    // Update status to processing
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    // Start processing in background
    processImportJob(jobId).catch(console.error);

    res.json({ message: 'Import processing started', jobId });
  } catch (error) {
    console.error('Process import error:', error);
    res.status(500).json({ error: 'Failed to start import processing' });
  }
};

// Background job processor
async function processImportJob(jobId: string) {
  try {
    const importJob = await prisma.import_jobs.findUnique({
      where: { id: jobId },
    });

    if (!importJob) return;

    // Re-parse the original file (in real implementation, store the parsed data)
    // For now, we'll use the preview data as a placeholder
    const csvData = importJob.preview_data as any[];
    const mapping = importJob.mapping_data as any;

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const idempotencyKey = generateIdempotencyKey(row, mapping);

      try {
        // Check for duplicates
        const existingRow = await prisma.import_rows.findFirst({
          where: { idempotency_key: idempotencyKey },
        });

        if (existingRow) {
          await prisma.import_rows.create({
            data: {
              import_job_id: jobId,
              row_number: i + 1,
              idempotency_key,
              raw_data: row,
              status: 'duplicate',
              error_message: 'Duplicate transaction detected',
            },
          });
          failureCount++;
          continue;
        }

        // Parse and validate data
        const amount = parseFloat(row[mapping.amount]?.replace(/[^\d.-]/g, '') || '0');
        const txDate = new Date(row[mapping.date]);
        const description = row[mapping.description];

        if (isNaN(amount) || !description || isNaN(txDate.getTime())) {
          await prisma.import_rows.create({
            data: {
              import_job_id: jobId,
              row_number: i + 1,
              idempotency_key,
              raw_data: row,
              status: 'failed',
              error_message: 'Invalid data format',
            },
          });
          failureCount++;
          continue;
        }

        // Create transaction
        const transaction = await prisma.transactions.create({
          data: {
            user_id: importJob.user_id,
            amount,
            type: row[mapping.type] || 'expense',
            description,
            tx_date: txDate,
            reference: row[mapping.reference] || null,
            notes: `Imported from ${importJob.filename}`,
          },
        });

        // Record successful import
        await prisma.import_rows.create({
          data: {
            import_job_id: jobId,
            row_number: i + 1,
            idempotency_key,
            raw_data: row,
            mapped_data: { amount, description, tx_date: txDate },
            transaction_id: transaction.id,
            status: 'processed',
          },
        });

        successCount++;
      } catch (error) {
        await prisma.import_rows.create({
          data: {
            import_job_id: jobId,
            row_number: i + 1,
            idempotency_key,
            raw_data: row,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        failureCount++;
      }
    }

    // Update job completion
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processed_rows: csvData.length,
        successful_rows: successCount,
        failed_rows: failureCount,
        completed_at: new Date(),
      },
    });

    // Create notification
    await prisma.notifications.create({
      data: {
        user_id: importJob.user_id,
        type: 'import_complete',
        title: 'Import Completed',
        message: `CSV import completed: ${successCount} successful, ${failureCount} failed`,
        data: { jobId, successCount, failureCount },
        channels: ['in_app', 'email'],
      },
    });

  } catch (error) {
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error_log: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// Get import job status
export const getImportStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user.userId;

    const importJob = await prisma.import_jobs.findFirst({
      where: { id: jobId, user_id: userId },
      include: {
        import_rows: {
          select: {
            status: true,
            error_message: true,
            row_number: true,
          },
        },
      },
    });

    if (!importJob) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    res.json({
      jobId,
      status: importJob.status,
      filename: importJob.filename,
      totalRows: importJob.total_rows,
      processedRows: importJob.processed_rows,
      successfulRows: importJob.successful_rows,
      failedRows: importJob.failed_rows,
      createdAt: importJob.created_at,
      completedAt: importJob.completed_at,
      errors: importJob.import_rows
        .filter(row => row.status === 'failed')
        .map(row => ({
          row: row.row_number,
          error: row.error_message,
        })),
    });
  } catch (error) {
    console.error('Get import status error:', error);
    res.status(500).json({ error: 'Failed to get import status' });
  }
};

// Get user's import history
export const getImportHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const importJobs = await prisma.import_jobs.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        filename: true,
        total_rows: true,
        successful_rows: true,
        failed_rows: true,
        status: true,
        created_at: true,
        completed_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.import_jobs.count({
      where: { user_id: userId },
    });

    res.json({
      imports: importJobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get import history error:', error);
    res.status(500).json({ error: 'Failed to get import history' });
  }
};