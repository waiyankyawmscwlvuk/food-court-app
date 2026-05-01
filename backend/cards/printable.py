"""
Generates a printable PDF card (credit-card sized) containing:
- Food Court logo / title
- Customer name
- Card number
- QR code image
- Balance (optional)
Designed to be printed and handed to the customer.
"""
import io
from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF


# Standard CR80 credit card size: 85.6mm x 54mm
CARD_WIDTH = 85.6 * mm
CARD_HEIGHT = 54 * mm


def generate_printable_card_pdf(card) -> bytes:
    """
    Generate a printable PDF card (CR80 credit-card size) for the customer.
    The card contains the QR code and card details ready to cut out and hand over.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=(CARD_WIDTH, CARD_HEIGHT),
        rightMargin=4 * mm,
        leftMargin=4 * mm,
        topMargin=3 * mm,
        bottomMargin=3 * mm,
    )

    title_style = ParagraphStyle(
        'title',
        fontSize=8,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        textColor=colors.white,
        leading=10,
    )
    normal_style = ParagraphStyle(
        'normal',
        fontSize=6,
        fontName='Helvetica',
        alignment=TA_LEFT,
        textColor=colors.white,
        leading=8,
    )
    card_num_style = ParagraphStyle(
        'cardnum',
        fontSize=7,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        textColor=colors.HexColor('#FFD700'),
        leading=9,
    )
    name_style = ParagraphStyle(
        'name',
        fontSize=7,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT,
        textColor=colors.white,
        leading=9,
    )

    # Build QR code image from saved file or regenerate
    qr_image = None
    if card.qr_code:
        try:
            qr_image = Image(card.qr_code.path, width=22 * mm, height=22 * mm)
        except Exception:
            pass

    if qr_image is None:
        # Regenerate QR on the fly if file missing
        import qrcode as qrcode_lib
        qr = qrcode_lib.QRCode(version=1, box_size=4, border=1)
        qr.add_data(str(card.uid))
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        qr_image = Image(img_buffer, width=22 * mm, height=22 * mm)

    # Layout: two columns — left: info, right: QR code
    left_content = [
        Paragraph('🍽 FOOD COURT', title_style),
        Spacer(1, 1 * mm),
        Paragraph('Prepaid Card', normal_style),
        Spacer(1, 2 * mm),
        Paragraph(card.card_number, card_num_style),
        Spacer(1, 2 * mm),
        Paragraph(card.customer_name.upper(), name_style),
        Spacer(1, 1 * mm),
        Paragraph(f'UID: {str(card.uid)[:8]}...', normal_style),
        Spacer(1, 1 * mm),
        Paragraph(f'Balance: {float(card.balance):,.0f} MMK', normal_style),
    ]

    data = [[left_content, qr_image]]
    table = Table(data, colWidths=[50 * mm, 26 * mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1a56db')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('LEFTPADDING', (0, 0), (0, 0), 3 * mm),
        ('RIGHTPADDING', (0, 0), (0, 0), 1 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2 * mm),
        ('RIGHTPADDING', (1, 0), (1, 0), 2 * mm),
        ('ROUNDEDCORNERS', [3 * mm, 3 * mm, 3 * mm, 3 * mm]),
    ]))

    story = [table]
    doc.build(story)
    return buffer.getvalue()


def generate_bulk_cards_pdf(cards) -> bytes:
    """
    Generate a single PDF with multiple printable cards arranged in a grid
    (3 cards per row, multiple rows) on A4 paper — ready to print and cut.
    """
    import qrcode as qrcode_lib
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.lib.utils import ImageReader

    buffer = io.BytesIO()
    page_width, page_height = A4
    margin = 10 * mm
    gap = 4 * mm
    cols = 3
    card_w = CARD_WIDTH
    card_h = CARD_HEIGHT

    c = pdf_canvas.Canvas(buffer, pagesize=A4)

    x_start = margin
    y_start = page_height - margin - card_h

    col = 0
    row = 0

    for card in cards:
        x = x_start + col * (card_w + gap)
        y = y_start - row * (card_h + gap)

        # Check if we need a new page
        if y < margin:
            c.showPage()
            col = 0
            row = 0
            x = x_start
            y = y_start

        # Draw card background
        c.setFillColor(colors.HexColor('#1a56db'))
        c.roundRect(x, y, card_w, card_h, 3 * mm, fill=1, stroke=0)

        # Draw cut guide (dashed border)
        c.setStrokeColor(colors.HexColor('#cccccc'))
        c.setLineWidth(0.3)
        c.setDash(3, 3)
        c.roundRect(x, y, card_w, card_h, 3 * mm, fill=0, stroke=1)
        c.setDash()

        # Title
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 8)
        c.drawCentredString(x + card_w / 2, y + card_h - 8 * mm, 'FOOD COURT PREPAID CARD')

        # Card number
        c.setFillColor(colors.HexColor('#FFD700'))
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(x + card_w / 2, y + card_h - 14 * mm, card.card_number)

        # Customer name
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawString(x + 4 * mm, y + card_h - 20 * mm, card.customer_name.upper())

        # Balance
        c.setFont('Helvetica', 6)
        c.drawString(x + 4 * mm, y + card_h - 26 * mm, f'Balance: {float(card.balance):,.0f} MMK')

        # UID short
        c.setFont('Helvetica', 5)
        c.setFillColor(colors.HexColor('#aabbff'))
        c.drawString(x + 4 * mm, y + 4 * mm, f'UID: {str(card.uid)[:16]}...')

        # QR Code
        try:
            if card.qr_code:
                qr_reader = ImageReader(card.qr_code.path)
            else:
                raise FileNotFoundError
        except Exception:
            qr = qrcode_lib.QRCode(version=1, box_size=4, border=1)
            qr.add_data(str(card.uid))
            qr.make(fit=True)
            img = qr.make_image(fill_color='black', back_color='white')
            img_buf = io.BytesIO()
            img.save(img_buf, format='PNG')
            img_buf.seek(0)
            qr_reader = ImageReader(img_buf)

        qr_size = 20 * mm
        c.drawImage(
            qr_reader,
            x + card_w - qr_size - 3 * mm,
            y + (card_h - qr_size) / 2,
            width=qr_size,
            height=qr_size,
            preserveAspectRatio=True,
            mask='auto',
        )

        col += 1
        if col >= cols:
            col = 0
            row += 1

    c.save()
    return buffer.getvalue()
