from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('cards', '0001_initial'),
        ('core', '0001_initial'),
        ('vendors', '0001_initial'),
        ('transactions', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('order_number', models.CharField(editable=False, max_length=20, unique=True)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('balance_before', models.DecimalField(decimal_places=2, max_digits=10)),
                ('balance_after', models.DecimalField(decimal_places=2, max_digits=10)),
                ('status', models.CharField(choices=[('completed', 'Completed'), ('rejected', 'Rejected')], default='completed', max_length=10)),
                ('rejection_reason', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('card', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='orders', to='cards.prepaidcard')),
                ('vendor', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='orders', to='vendors.vendor')),
                ('processed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_orders', to='core.user')),
                ('transaction', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='order', to='transactions.transaction')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('food_item_name', models.CharField(max_length=100)),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=8)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('subtotal', models.DecimalField(decimal_places=2, max_digits=10)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='orders.order')),
                ('food_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='order_items', to='vendors.fooditem')),
            ],
            options={'ordering': ['id']},
        ),
    ]
