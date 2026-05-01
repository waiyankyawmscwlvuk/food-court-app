import io
import qrcode
from django.core.files.base import ContentFile
from django.http import HttpResponse

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PrepaidCard
from .serializers import PrepaidCardSerializer, PrepaidCardCreateSerializer, CardScanSerializer
from foodcourt.core.permissions import IsAdmin, IsAdminOrCounter


class PrepaidCardListCreateView(generics.ListCreateAPIView):
    """List all cards or create a new prepaid card."""
    queryset = PrepaidCard.objects.all()
    permission_classes = [IsAdminOrCounter]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PrepaidCardCreateSerializer
        return PrepaidCardSerializer

    def perform_create(self, serializer):
        card = serializer.save(created_by=self.request.user)
        self._generate_qr_code(card)

    def _generate_qr_code(self, card):
        """Generate QR code image for the card."""
        qr_data = str(card.uid)
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        filename = f'card_{card.card_number}.png'
        card.qr_code.save(filename, ContentFile(buffer.getvalue()), save=True)


class PrepaidCardDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update a prepaid card."""
    queryset = PrepaidCard.objects.all()
    serializer_class = PrepaidCardSerializer
    permission_classes = [IsAdminOrCounter]


class CardStatusToggleView(APIView):
    """Activate or deactivate a prepaid card."""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            card = PrepaidCard.objects.get(pk=pk)
        except PrepaidCard.DoesNotExist:
            return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)

        if card.status == PrepaidCard.Status.ACTIVE:
            card.status = PrepaidCard.Status.INACTIVE
        else:
            card.status = PrepaidCard.Status.ACTIVE
        card.save()
        serializer = PrepaidCardSerializer(card, context={'request': request})
        return Response(serializer.data)


class CardScanView(APIView):
    """Scan QR code (by UID) and return card details."""
    permission_classes = [IsAdminOrCounter]

    def post(self, request):
        serializer = CardScanSerializer(data=request.data)
        if serializer.is_valid():
            try:
                card = PrepaidCard.objects.get(uid=serializer.validated_data['uid'])
                return Response(PrepaidCardSerializer(card, context={'request': request}).data)
            except PrepaidCard.DoesNotExist:
                return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PrintCardView(APIView):
    """Download a single printable PDF card (credit-card size)."""
    permission_classes = [IsAdminOrCounter]

    def get(self, request, pk):
        try:
            card = PrepaidCard.objects.get(pk=pk)
        except PrepaidCard.DoesNotExist:
            return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)

        from .printable import generate_printable_card_pdf
        pdf_bytes = generate_printable_card_pdf(card)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="card_{card.card_number}.pdf"'
        return response


class PrintBulkCardsView(APIView):
    """
    Download a printable A4 PDF sheet with multiple cards.
    POST with optional { "card_ids": [1, 2, 3] } — omit to print all active cards.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        card_ids = request.data.get('card_ids')
        if card_ids:
            cards = PrepaidCard.objects.filter(pk__in=card_ids, status='active')
        else:
            cards = PrepaidCard.objects.filter(status='active').order_by('card_number')

        if not cards.exists():
            return Response({'error': 'No active cards found.'}, status=status.HTTP_404_NOT_FOUND)

        from .printable import generate_bulk_cards_pdf
        pdf_bytes = generate_bulk_cards_pdf(list(cards))
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="cards_bulk_print.pdf"'
        return response
