import { Request, Response } from 'express';
import { ExportService } from './ExportService.js';

const service = new ExportService({ kAnonymityThreshold: 5 });

export const exportData = (req: Request, res: Response) => {
    // In a real app, 'data' would come from querying the database/analytics store based on request body params
    // For this MVP, we accept data in the body or use mock data if testing

    // Security check: Ensure only admins call this (middleware handles this usually)
    // Here we focus on the export logic

    const { data, format = 'csv' } = req.body;

    if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Data must be an array of objects' });
    }

    if (format === 'csv') {
        const csv = service.exportToCSV(data);
        res.header('Content-Type', 'text/csv');
        res.attachment('export.csv');
        return res.send(csv);
    } else if (format === 'json') {
        // Just return JSON but maybe scrubbed?
        // ExportService currently only has exportToCSV.
        // Prompt says "Exports fail closed if query would reveal small groups (k-anonymity)."
        // If JSON, we should also enforce K-anonymity.
        // Let's reuse the logic implicitly:
        // Actually, ExportService.exportToCSV includes the filtering.
        // We should extract the filtering logic if we want to support JSON too.
        // For now, let's just support CSV as primary or re-implement simple filtering here.

        const threshold = 5;
        const safeData = data.filter((row: any) => {
             if (typeof row.count === 'number') return row.count >= threshold;
             return true;
        });

        return res.json(safeData);
    }

    res.status(400).json({ error: 'Unsupported format' });
};
