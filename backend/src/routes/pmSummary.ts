import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { PmSummary } from '../types/modules.js';

const router = Router();

function formatDate(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal);
}

function mapRowToPmSummary(row: any): PmSummary {
  return {
    id: Number(row.id),
    headerId: row.header_id ? Number(row.header_id) : null,
    prjMgrId: row.prj_mgr_id ? Number(row.prj_mgr_id) : null,
    prjMgrName: row.prj_mgr_name,
    prjTypeCode: row.prj_type_code,
    prjTypeDescription: row.prj_type_description,
    noOfProject: row.no_of_project ? Number(row.no_of_project) : null,
    createdDate: formatDate(row.created_date)
  };
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const prjMgrId = req.query.prjMgrId;
    let queryText = 'SELECT * FROM pm_project_type_summary';
    const values: any[] = [];
    
    if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
      const pmId = Number(prjMgrId);
      if (!isNaN(pmId)) {
        queryText += ' WHERE prj_mgr_id = $1';
        values.push(pmId);
      }
    }
    
    queryText += ' ORDER BY id ASC';
    
    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToPmSummary);
    res.json({
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Database query error in pm-summary:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving pm summary records.'
    });
  }
});

export default router;
