"""
Receipt PDF generation using ReportLab.
Generates a PDF receipt for a completed order.
"""
import io
from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


def generate_receipt_pdf(order) -> bytes:
    """Generate a PDF receipt for the given order and return as bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A6,
        rightMargin=10 * mm,
        leftMargin=10 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('title', parent=styles['Normal'],
                                 fontSize=14, alignment=TA_CENTER, fontName='Helvetica-Bold')
    center_style = ParagraphStyle('center', parent=styles['Normal'],
                                  fontSize=9, alignment=TA_CENTER)
    normal_style = ParagraphStyle('normal', parent=styles['Normal'],
                                  fontSize=9, alignment=TA_LEFT)
    right_style = ParagraphStyle('right', parent=styles['Normal'],
                                 fontSize=9, alignment=TA_RIGHT)
    bold_style = ParagraphStyle('bold', parent=styles['Normal'],
                                fontSize=9, fontName='Helvetica-Bold')

    story = []

    # Header
    story.append(Paragraph("FOOD COURT", title_style))
    story.append(Paragraph("Prepaid Card Receipt", center_style))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 2 * mm))

    # Order info
    story.append(Paragraph(f"<b>Order No:</b> {order.order_number}", normal_style))
    story.append(Paragraph(f"<b>Date:</b> {order.created_at.strftime('%d/%m/%Y %H:%M')}", normal_style))
    story.append(Paragraph(f"<b>Vendor:</b> {order.vendor.name} (Stall {order.vendor.stall_number})", normal_style))
    story.append(Paragraph(f"<b>Customer:</b> {order.card.customer_name}", normal_style))
    story.append(Paragraph(f"<b>Card No:</b> {order.card.card_number}", normal_style))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Spacer(1, 2 * mm))

    # Items table
    table_data = [['Item', 'Qty', 'Price', 'Subtotal']]
    for item in order.items.all():
        table_data.append([
            item.food_item_name,
            str(item.quantity),
            f"{item.unit_price:.2f}",
            f"{item.subtotal:.2f}",
        ])

    table = Table(table_data, colWidths=[40 * mm, 10 * mm, 20 * mm, 22 * mm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(table)
    story.append(Spacer(1, 2 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 2 * mm))

    # Totals
    story.append(Paragraph(f"<b>TOTAL: {order.total_amount:.2f}</b>", right_style))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(f"Balance Before: {order.balance_before:.2f}", right_style))
    story.append(Paragraph(f"<b>Remaining Balance: {order.balance_after:.2f}</b>", right_style))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))

    # Footer
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(f"Served by: {order.processed_by.get_full_name() or order.processed_by.username}", center_style))
    story.append(Paragraph("Thank you for dining with us!", center_style))
    story.append(Paragraph(f"Txn ID: {order.transaction.transaction_id if order.transaction else 'N/A'}", center_style))

    doc.build(story)
    return buffer.getvalue()
