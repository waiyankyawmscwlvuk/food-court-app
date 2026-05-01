from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('cards', '0001_initial'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transaction_id', models.CharField(editable=False, max_length=20, unique=True)),
                ('transaction_type', models.CharField(choices=[('topup', 'Top-Up'), ('purchase', 'Purchase')], max_length=10)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('balance_before', models.DecimalField(decimal_places=2, max_digits=10)),
                ('balance_after', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payment_method', models.CharField(blank=True, choices=[('cash', 'Cash'), ('digital_wallet', 'Digital Wallet'), ('bank_card', 'Bank Card')], max_length=20, null=True)),
                ('note', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('card', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transactions', to='cards.prepaidcard')),
                ('processed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_transactions', to='core.user')),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
