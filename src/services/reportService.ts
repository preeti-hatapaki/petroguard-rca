import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, LevelFormat } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { CauseNode } from './gemini';
import { ActionItem } from '../store';

export const reportService = {
  generateWordReport: async (incident: string, nodes: CauseNode[], actions: ActionItem[]) => {
    const buildHierarchy = (parentId: string | undefined, level: number): Paragraph[] => {
      const children = nodes.filter(n => n.parentId === parentId);
      let paragraphs: Paragraph[] = [];

      children.forEach(node => {
        const indent = level * 720; // 720 twips = 0.5 inch
        paragraphs.push(
          new Paragraph({
            text: `${node.label} [${node.status.toUpperCase()}]`,
            heading: level === 0 ? HeadingLevel.HEADING_2 : undefined,
            indent: { left: indent },
            spacing: { before: 200, after: 100 },
            bullet: level > 0 ? { level: level - 1 } : undefined,
          })
        );
        paragraphs.push(
          new Paragraph({
            text: node.description,
            indent: { left: indent + 360 },
            spacing: { after: 200 },
          })
        );
        if (node.remark) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Remark: ", bold: true }),
                new TextRun({ text: node.remark, italics: true }),
              ],
              indent: { left: indent + 360 },
              spacing: { after: 200 },
            })
          );
        }
        paragraphs = [...paragraphs, ...buildHierarchy(node.id, level + 1)];
      });

      return paragraphs;
    };

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "PetroGuard RCA Investigation Report",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Incident Description",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            new Paragraph({
              text: incident,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Root Cause Analysis Tree Structure",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            ...buildHierarchy(undefined, 0),
            new Paragraph({
              text: "Action Plan",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Root Cause", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Action", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Owner", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Deadline", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })] }),
                  ],
                }),
                ...actions.map(action => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(action.rootCauseLabel)] }),
                    new TableCell({ children: [new Paragraph(action.action)] }),
                    new TableCell({ children: [new Paragraph(action.owner || "TBD")] }),
                    new TableCell({ children: [new Paragraph(action.deadline || "TBD")] }),
                    new TableCell({ children: [new Paragraph(action.status.toUpperCase())] }),
                  ],
                })),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `PetroGuard_RCA_Report_${new Date().toISOString().split('T')[0]}.docx`);
  },

  generateExcelReport: (nodes: CauseNode[], actions: ActionItem[]) => {
    // Tree Structure Sheet
    const treeData = nodes.map(node => ({
      ID: node.id,
      ParentID: node.parentId || 'ROOT',
      Layer: node.layer,
      Label: node.label,
      Description: node.description,
      Status: node.status,
      Remark: node.remark || ''
    }));

    const treeWs = XLSX.utils.json_to_sheet(treeData);
    
    // Action Plan Sheet
    const actionData = actions.map(action => ({
      RootCause: action.rootCauseLabel,
      Action: action.action,
      Description: action.description,
      Owner: action.owner,
      Deadline: action.deadline,
      Status: action.status
    }));
    const actionWs = XLSX.utils.json_to_sheet(actionData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, treeWs, "RCA Tree Structure");
    XLSX.utils.book_append_sheet(wb, actionWs, "Action Plan");

    XLSX.writeFile(wb, `PetroGuard_RCA_Tree_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};
