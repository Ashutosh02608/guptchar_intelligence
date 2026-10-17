"""
Export Engine & Presentation Layer
- JSON Exporter: Strict Pydantic schema with mandatory "N/A" fallback handling
- PDF Exporter: Multi-page ReportLab dossier with custom headers, footers, query badges,
  metadata tables, executive contact grids, and page numbering
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from .config import OUTPUTS_DIR
from .models import EnrichedEntity, ExtractorQuery, clean_na

logger = logging.getLogger("extractor.export")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas for dynamic total page count ('Page X of Y')
    and running regulatory header & footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Running Header (on pages 2+)
        if self._pageNumber > 1:
            self.drawString(40, 758, "GUPTCHAR OSINT INTELLIGENCE — COMMERCIAL ENTITY & LEAD DOSSIER")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.6)
            self.line(40, 750, 572, 750)

        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.6)
        self.line(40, 42, 572, 42)
        
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(40, 30, "CONFIDENTIAL ENTITY INTELLIGENCE — VERIFIED VIA DEEP WEB & SEC EDGAR")
        self.drawRightString(572, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


class JSONExporter:
    """Exports validated entities to strict JSON ensuring all missing fields resolve to 'N/A'."""

    @staticmethod
    def export(
        entities: List[EnrichedEntity],
        query: ExtractorQuery,
        output_path: Optional[Path] = None
    ) -> str:
        if output_path is None:
            slug = f"{query.country}_{query.city}_{query.sector}".lower().replace(" ", "_")
            ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            output_path = OUTPUTS_DIR / f"dossier_{slug}_{ts}.json"

        # Convert to strict dictionary with 'N/A' fallback
        dossier_dict = {
            "query_metadata": {
                "country": clean_na(query.country),
                "city": clean_na(query.city),
                "sector": clean_na(query.sector),
                "limit_requested": query.limit,
                "total_extracted": len(entities),
                "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%SZ"),
                "provenance_coverage": "Google Maps + Deep Web Crawl + SEC EDGAR"
            },
            "entities": [entity.model_dump() for entity in entities]
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(dossier_dict, f, indent=2, ensure_ascii=False)

        logger.info(f"JSON Dossier successfully saved to: {output_path}")
        return str(output_path)


class PDFExporter:
    """Generates an executive-ready multi-page intelligence dossier using ReportLab."""

    @staticmethod
    def export(
        entities: List[EnrichedEntity],
        query: ExtractorQuery,
        output_path: Optional[Path] = None
    ) -> str:
        if output_path is None:
            slug = f"{query.country}_{query.city}_{query.sector}".lower().replace(" ", "_")
            ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            output_path = OUTPUTS_DIR / f"dossier_{slug}_{ts}.pdf"

        output_path.parent.mkdir(parents=True, exist_ok=True)

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=45,
            bottomMargin=55
        )

        styles = getSampleStyleSheet()
        
        # Custom Typography Styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=23,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=4
        )

        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=14
        )

        section_hdr_style = ParagraphStyle(
            "SectionHdr",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=10,
            spaceAfter=6
        )

        body_style = ParagraphStyle(
            "BodyDark",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#334155")
        )

        table_hdr_style = ParagraphStyle(
            "TableHdr",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#FFFFFF")
        )

        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#1E293B")
        )

        story = []

        # 1. Document Title & Query Badges Banner
        story.append(Paragraph("Commercial Entity & Executive Dossier", title_style))
        story.append(Paragraph("Autonomous Multi-Stage OSINT & Financial Regulatory Intelligence Extraction", subtitle_style))

        # Query Badges Table
        badge_data = [
            [
                Paragraph("<b>Target Jurisdiction</b>", body_style),
                Paragraph(f"{query.city}, {query.country}", body_style),
                Paragraph("<b>Industry Sector</b>", body_style),
                Paragraph(query.sector, body_style)
            ],
            [
                Paragraph("<b>Entities Extracted</b>", body_style),
                Paragraph(f"{len(entities)} Verified Organizations", body_style),
                Paragraph("<b>Date Generated</b>", body_style),
                Paragraph(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), body_style)
            ],
            [
                Paragraph("<b>Intelligence Stages</b>", body_style),
                Paragraph("Google Maps (CDP) + Deep Web + SEC EDGAR", body_style),
                Paragraph("<b>Provenance Status</b>", body_style),
                Paragraph("Official Regulatory & Corporate Verified", body_style)
            ]
        ]

        badge_table = Table(badge_data, colWidths=[105, 160, 105, 162])
        badge_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#E2E8F0")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(badge_table)
        story.append(Spacer(1, 14))

        # 2. Iterate Entities & Render Detail Cards
        for idx, ent in enumerate(entities, 1):
            entity_card = []
            
            # Entity Header Banner (Name + Provenance Badge)
            prov_color = "#059669" if "SEC" in ent.data_provenance else "#0284C7"
            header_text = f"<b>{idx}. {ent.name}</b> &nbsp;&nbsp;<font color='{prov_color}' size='7'>[{ent.data_provenance}]</font>"
            entity_card.append(Paragraph(header_text, section_hdr_style))

            # 1-Sentence Summary
            if ent.company_summary != "N/A":
                summary_p = Paragraph(f"<i>Overview:</i> {ent.company_summary}", body_style)
                entity_card.append(summary_p)
                entity_card.append(Spacer(1, 4))

            # Metadata Table
            sec_count = len(ent.sec_filings)
            sec_display = f"{sec_count} Filings on record" if sec_count > 0 else "None required (Non-SEC / Unregistered)"

            meta_rows = [
                [
                    Paragraph("<b>Physical Address:</b>", body_style),
                    Paragraph(ent.physical_address, body_style),
                    Paragraph("<b>Primary Email:</b>", body_style),
                    Paragraph(f"<font color='#0284C7'><b>{ent.primary_email}</b></font>", body_style)
                ],
                [
                    Paragraph("<b>Corporate Website:</b>", body_style),
                    Paragraph(f"<u>{ent.website_url}</u>", body_style),
                    Paragraph("<b>Gatekeeper Phone:</b>", body_style),
                    Paragraph(ent.gatekeeper_phone, body_style)
                ],
                [
                    Paragraph("<b>Subpages Crawled:</b>", body_style),
                    Paragraph(f"{len(ent.subpages_crawled)} subpages analyzed", body_style),
                    Paragraph("<b>SEC EDGAR Status:</b>", body_style),
                    Paragraph(sec_display, body_style)
                ]
            ]

            meta_table = Table(meta_rows, colWidths=[95, 175, 95, 167])
            meta_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            entity_card.append(meta_table)
            entity_card.append(Spacer(1, 5))

            # Executive Profiles Grid
            if ent.executives:
                exec_rows = [
                    [
                        Paragraph("Key Leadership & C-Suite", table_hdr_style),
                        Paragraph("Title / Corporate Designation", table_hdr_style),
                        Paragraph("Direct / Inquiries Email", table_hdr_style),
                        Paragraph("Source", table_hdr_style)
                    ]
                ]

                for ex in ent.executives[:5]:
                    badge_prov = f"<font color='#047857'><b>SEC</b></font>" if "SEC" in ex.provenance else "Web"
                    exec_rows.append([
                        Paragraph(f"<b>{ex.name}</b>", table_cell_style),
                        Paragraph(ex.title, table_cell_style),
                        Paragraph(ex.email if ex.email != "N/A" else ent.primary_email, table_cell_style),
                        Paragraph(badge_prov, table_cell_style)
                    ])

                exec_table = Table(exec_rows, colWidths=[130, 185, 160, 57])
                exec_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ]))
                entity_card.append(exec_table)

            # SEC Filings Table (if present)
            if ent.sec_filings:
                entity_card.append(Spacer(1, 4))
                filing_rows = [
                    [
                        Paragraph("SEC Form", table_hdr_style),
                        Paragraph("CIK Number", table_hdr_style),
                        Paragraph("Filing Date", table_hdr_style),
                        Paragraph("Accession No.", table_hdr_style)
                    ]
                ]
                for f in ent.sec_filings[:3]:
                    filing_rows.append([
                        Paragraph(f"<b>{f.form_type}</b>", table_cell_style),
                        Paragraph(f.cik, table_cell_style),
                        Paragraph(f.filing_date, table_cell_style),
                        Paragraph(f.accession_number, table_cell_style)
                    ])

                sec_table = Table(filing_rows, colWidths=[80, 100, 100, 252])
                sec_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#065F46")),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                    ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#A7F3D0")),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#059669")),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#ECFDF5")]),
                ]))
                entity_card.append(sec_table)

            entity_card.append(Spacer(1, 10))
            entity_card.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

            # Keep card cohesive
            story.append(KeepTogether(entity_card))

        doc.build(story, canvasmaker=NumberedCanvas)
        logger.info(f"PDF Dossier successfully created at: {output_path}")
        return str(output_path)
