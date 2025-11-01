import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  uploadCSV,
  configureMapping,
  previewMapping,
  processImport,
  getImportStatus,
  getImportHistory,
} from '../controllers/import.controller';

const router = Router();

// All import routes require authentication
router.use(auth);

// Upload CSV file for analysis
router.post('/upload', uploadCSV);

// Configure column mapping for import job
router.put('/:jobId/mapping', configureMapping);

// Preview mapped data before import
router.get('/:jobId/preview', previewMapping);

// Start processing the import
router.post('/:jobId/process', processImport);

// Get import job status
router.get('/:jobId/status', getImportStatus);

// Get user's import history
router.get('/history', getImportHistory);

export default router;