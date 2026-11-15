import { PrismaClient, Role, PaymentMethod, StockMovementType, FbrStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Kiryana POS database (Fast Batch Mode)...");

  // 1. Clear existing seed data safely
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.khataLedger.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.productBatch.deleteMany();
  await prisma.productBarcode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  // 2. Create Store
  const store = await prisma.store.create({
    data: {
      nameEn: "Bismillah General Store & Mini-Mart",
      nameUr: "بسم اللہ جنرل اسٹور اینڈ منی مارٹ",
      phone: "+92 300 8472910",
      address: "Shop 14-16, Ghazi Road, DHA Phase 1, Lahore",
      fbrPosId: "100101",
      fbrAuthToken: "fbr-sandbox-token-2026",
      fbrEnabled: true,
      taxRateBasisPoints: 0,
      taxInclusive: true,
    },
  });

  // 3. Create Users with Hashed PINs
  const pin1234 = await bcrypt.hash("1234", 10);
  const pin5678 = await bcrypt.hash("5678", 10);
  const pin9999 = await bcrypt.hash("9999", 10);

  const owner = await prisma.user.create({
    data: {
      name: "Haji Muhammad Aslam",
      email: "owner@kiryana.pk",
      pinHash: pin1234,
      role: Role.OWNER,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Tariq Mehmood",
      email: "manager@kiryana.pk",
      pinHash: pin5678,
      role: Role.MANAGER,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: "Bilal Ahmad",
      email: "cashier@kiryana.pk",
      pinHash: pin9999,
      role: Role.CASHIER,
    },
  });

  const stockKeeper = await prisma.user.create({
    data: {
      name: "Rashid Ali",
      email: "stock@kiryana.pk",
      pinHash: pin1234,
      role: Role.STOCK_KEEPER,
    },
  });

  console.log("Users created. Owner PIN: 1234, Manager: 5678, Cashier: 9999");

  // 4. Create Customers
  const customerData = [
    { name: "Chaudhry Riaz", phone: "03001234567", address: "House 45, Street 2", creditLimitPaisa: 2500000, currentBalancePaisa: 645000 },
    { name: "Malik Usman", phone: "03219876543", address: "Flat 4B, Phase 1", creditLimitPaisa: 1500000, currentBalancePaisa: 280000 },
    { name: "Doctor Shahid", phone: "03334567890", address: "Clinic Road", creditLimitPaisa: 3000000, currentBalancePaisa: 0 },
    { name: "Baji Farhat", phone: "03456789012", address: "House 12, Lane 4", creditLimitPaisa: 1000000, currentBalancePaisa: 450000 },
    { name: "Master Zubair", phone: "03012345678", address: "Govt High School", creditLimitPaisa: 2000000, currentBalancePaisa: 980000 },
    { name: "Sheikh Waqas", phone: "03123456789", address: "Main Bazar", creditLimitPaisa: 5000000, currentBalancePaisa: 1450000 },
    { name: "Rana Imran", phone: "03223456789", address: "Near Masjid", creditLimitPaisa: 1500000, currentBalancePaisa: 0 },
    { name: "Ammi Jee (Begum Akhtar)", phone: "03323456789", address: "House 89", creditLimitPaisa: 2000000, currentBalancePaisa: 320000 },
  ];

  const customers = [];
  for (const c of customerData) {
    const cust = await prisma.customer.create({ data: c });
    customers.push(cust);
    if (c.currentBalancePaisa > 0) {
      await prisma.khataLedger.create({
        data: {
          customerId: cust.id,
          amountPaisa: c.currentBalancePaisa,
          balanceAfterPaisa: c.currentBalancePaisa,
          notes: "Previous monthly grocery balance",
          createdById: owner.id,
        },
      });
    }
  }

  // 5. Authentic Pakistani Kiryana Catalog (~300 SKUs)
  const baseItems = [
    // Tea & Whitener
    { nameEn: "Tapal Danedar Tea 430g", nameUr: "ٹپال دانے دار چائے 430 گرام", category: "Tea & Beverages", brand: "Tapal", unit: "piece", cost: 720, sale: 800, stock: 45 },
    { nameEn: "Tapal Danedar Tea 900g Pouch", nameUr: "ٹپال دانے دار چائے 900 گرام", category: "Tea & Beverages", brand: "Tapal", unit: "piece", cost: 1480, sale: 1620, stock: 28 },
    { nameEn: "Tapal Danedar Tea 190g", nameUr: "ٹپال دانے دار چائے 190 گرام", category: "Tea & Beverages", brand: "Tapal", unit: "piece", cost: 350, sale: 390, stock: 60 },
    { nameEn: "Vital Tea 400g Pouch", nameUr: "وائٹل چائے 400 گرام", category: "Tea & Beverages", brand: "Vital", unit: "piece", cost: 680, sale: 750, stock: 35 },
    { nameEn: "Lipton Yellow Label 380g", nameUr: "لپٹن یلو لیبل چائے 380 گرام", category: "Tea & Beverages", brand: "Lipton", unit: "piece", cost: 710, sale: 790, stock: 30 },
    { nameEn: "Everyday Milk Powder 850g", nameUr: "ایوری ڈے ملک پاؤڈر 850 گرام", category: "Tea & Beverages", brand: "Nestle", unit: "piece", cost: 1350, sale: 1490, stock: 25 },
    { nameEn: "Tarang Tea Whitener 225ml", nameUr: "ترنگ ٹی وائٹنر 225 ملی لیٹر", category: "Tea & Beverages", brand: "Engro", unit: "piece", cost: 68, sale: 80, stock: 120 },

    // Milk & Dairy
    { nameEn: "Nestle MilkPak 1 Litre", nameUr: "نسلے ملک پیک 1 لیٹر", category: "Dairy & Eggs", brand: "Nestle", unit: "piece", cost: 265, sale: 290, stock: 85 },
    { nameEn: "Olpers Milk 1 Litre", nameUr: "اولپرز دودھ 1 لیٹر", category: "Dairy & Eggs", brand: "Engro", unit: "piece", cost: 265, sale: 290, stock: 90 },
    { nameEn: "Nurpur Fresh Milk 1 Litre", nameUr: "نورپور دودھ 1 لیٹر", category: "Dairy & Eggs", brand: "Nurpur", unit: "piece", cost: 255, sale: 280, stock: 40 },
    { nameEn: "Farm Fresh Eggs 1 Dozen", nameUr: "فارمی انڈے 1 درجن", category: "Dairy & Eggs", brand: "Poultry", unit: "piece", cost: 310, sale: 350, stock: 50 },
    { nameEn: "Desi Eggs 1 Dozen", nameUr: "دیسی انڈے 1 درجن", category: "Dairy & Eggs", brand: "Local", unit: "piece", cost: 480, sale: 550, stock: 20 },
    { nameEn: "Adam's Cheddar Cheese 200g", nameUr: "ایڈمز چیڈر پنیر 200 گرام", category: "Dairy & Eggs", brand: "Adam's", unit: "piece", cost: 580, sale: 660, stock: 15 },
    { nameEn: "Nurpur Butter 200g", nameUr: "نورپور مکھن 200 گرام", category: "Dairy & Eggs", brand: "Nurpur", unit: "piece", cost: 360, sale: 410, stock: 30 },

    // Spices & Masalas
    { nameEn: "National Biryani Masala Double Pack", nameUr: "نیشنل بریانی مصالحہ ڈبل پیک", category: "Spices & Recipe Mix", brand: "National", unit: "piece", cost: 135, sale: 155, stock: 100 },
    { nameEn: "National Korma Masala", nameUr: "نیشنل قورمہ مصالحہ", category: "Spices & Recipe Mix", brand: "National", unit: "piece", cost: 135, sale: 155, stock: 80 },
    { nameEn: "National Tikka Boti Masala", nameUr: "نیشنل تکہ بوٹی مصالحہ", category: "Spices & Recipe Mix", brand: "National", unit: "piece", cost: 135, sale: 155, stock: 65 },
    { nameEn: "Shan Special Bombay Biryani Masala", nameUr: "شان بمبئی بریانی مصالحہ", category: "Spices & Recipe Mix", brand: "Shan", unit: "piece", cost: 140, sale: 160, stock: 110 },
    { nameEn: "Shan Sindhi Biryani Masala", nameUr: "شان سندھی بریانی مصالحہ", category: "Spices & Recipe Mix", brand: "Shan", unit: "piece", cost: 140, sale: 160, stock: 95 },
    { nameEn: "Shan Karahi Gosht Masala", nameUr: "شان کڑاہی گوشت مصالحہ", category: "Spices & Recipe Mix", brand: "Shan", unit: "piece", cost: 140, sale: 160, stock: 85 },
    { nameEn: "Shan Chaat Masala 100g", nameUr: "شان چاٹ مصالحہ 100 گرام", category: "Spices & Recipe Mix", brand: "Shan", unit: "piece", cost: 120, sale: 140, stock: 70 },
    { nameEn: "National Haldi Powder 200g", nameUr: "نیشنل پسی ہوئی ہلدی 200 گرام", category: "Spices & Recipe Mix", brand: "National", unit: "piece", cost: 190, sale: 230, stock: 45 },
    { nameEn: "National Red Chilli Powder 200g", nameUr: "نیشنل پسی ہوئی لال مرچ 200 گرام", category: "Spices & Recipe Mix", brand: "National", unit: "piece", cost: 240, sale: 280, stock: 50 },
    { nameEn: "National Iodized Salt 800g", nameUr: "نیشنل آئیوڈین ملا نمک 800 گرام", category: "Spices & Recipe Mix", brand: "National", unit: "piece", cost: 55, sale: 70, stock: 150 },
    { nameEn: "Lahori Pink Rock Salt 1kg", nameUr: "لاہوری کالا/گلابی نمک 1 کلو", category: "Spices & Recipe Mix", brand: "Local", unit: "kg", cost: 40, sale: 60, stock: 200 },

    // Cooking Oil & Banaspati Ghee
    { nameEn: "Dalda Cooking Oil 1 Litre Pouch", nameUr: "ڈالڈا کوکنگ آئل 1 لیٹر پاؤچ", category: "Oil & Ghee", brand: "Dalda", unit: "piece", cost: 495, sale: 540, stock: 65 },
    { nameEn: "Dalda Cooking Oil 5 Litre Can", nameUr: "ڈالڈا کوکنگ آئل 5 لیٹر کین", category: "Oil & Ghee", brand: "Dalda", unit: "piece", cost: 2450, sale: 2680, stock: 20 },
    { nameEn: "Dalda Banaspati Ghee 1kg Pouch", nameUr: "ڈالڈا بناسپتی گھی 1 کلو پاؤچ", category: "Oil & Ghee", brand: "Dalda", unit: "piece", cost: 485, sale: 530, stock: 55 },
    { nameEn: "Habib Cooking Oil 1 Litre Pouch", nameUr: "حبیب کوکنگ آئل 1 لیٹر پاؤچ", category: "Oil & Ghee", brand: "Habib", unit: "piece", cost: 480, sale: 525, stock: 45 },
    { nameEn: "Sufi Sunflower Cooking Oil 1L", nameUr: "صوفی سن فلاور آئل 1 لیٹر", category: "Oil & Ghee", brand: "Sufi", unit: "piece", cost: 510, sale: 560, stock: 40 },
    { nameEn: "Mezan Canola Oil 1 Litre", nameUr: "میزان کینولا آئل 1 لیٹر", category: "Oil & Ghee", brand: "Mezan", unit: "piece", cost: 490, sale: 535, stock: 50 },

    // Grains, Rice, Atta & Pulses (Sold by kg / decimal)
    { nameEn: "Super Basmati Rice (Kainat) per kg", nameUr: "سپر باسپتی چاول (کائنات) فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 310, sale: 370, stock: 450 },
    { nameEn: "Sella Basmati Rice per kg", nameUr: "سیلہ باسمتی چاول فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 290, sale: 340, stock: 300 },
    { nameEn: "Tota Rice (Broken Basmati) per kg", nameUr: "ٹوٹا چاول فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 160, sale: 200, stock: 250 },
    { nameEn: "Daal Chana per kg", nameUr: "دال چنا فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 240, sale: 290, stock: 180 },
    { nameEn: "Daal Moong Dhooli per kg", nameUr: "دال مونگ دھلی فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 260, sale: 320, stock: 160 },
    { nameEn: "Daal Masoor Sabut per kg", nameUr: "دال مسور ثابت فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 270, sale: 330, stock: 140 },
    { nameEn: "Daal Mash Dhooli per kg", nameUr: "دال ماش دھلی فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 460, sale: 540, stock: 120 },
    { nameEn: "Safaid Chana (White Chickpeas) per kg", nameUr: "سفید چنے بڑے فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 360, sale: 420, stock: 200 },
    { nameEn: "Kala Chana (Black Chickpeas) per kg", nameUr: "کالے چنے فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 210, sale: 260, stock: 170 },
    { nameEn: "Besan (Gram Flour) per kg", nameUr: "بیسن خالص فی کلو", category: "Grains & Pulses", brand: "Grain Market", unit: "kg", cost: 250, sale: 300, stock: 220 },
    { nameEn: "White Refined Sugar (Cheeni) per kg", nameUr: "چینی سفید فی کلو", category: "Grains & Pulses", brand: "Mill", unit: "kg", cost: 135, sale: 155, stock: 800 },
    { nameEn: "Desi Gur (Jaggery) per kg", nameUr: "دیسی گڑ خالص فی کلو", category: "Grains & Pulses", brand: "Local", unit: "kg", cost: 180, sale: 230, stock: 150 },
    { nameEn: "Chakki Atta (Whole Wheat Flour) 10kg Bag", nameUr: "چکی کا آٹا 10 کلو تھیلا", category: "Grains & Pulses", brand: "Sunridge", unit: "piece", cost: 1250, sale: 1380, stock: 40 },
    { nameEn: "Chakki Atta (Whole Wheat Flour) 20kg Bag", nameUr: "چکی کا آٹا 20 کلو تھیلا", category: "Grains & Pulses", brand: "Sunridge", unit: "piece", cost: 2450, sale: 2690, stock: 25 },
    { nameEn: "Maida (Fine Flour) per kg", nameUr: "میدہ فائن فی کلو", category: "Grains & Pulses", brand: "Mill", unit: "kg", cost: 120, sale: 150, stock: 200 },
    { nameEn: "Suji (Semolina) per kg", nameUr: "سوجی فی کلو", category: "Grains & Pulses", brand: "Mill", unit: "kg", cost: 130, sale: 160, stock: 150 },

    // Bakery & Biscuits
    { nameEn: "Dawn Plain Bread Large", nameUr: "ڈان سادہ ڈبل روٹی بڑی", category: "Bakery & Biscuits", brand: "Dawn", unit: "piece", cost: 165, sale: 190, stock: 35 },
    { nameEn: "Dawn Milky Bread Small", nameUr: "ڈان ملکی ڈبل روٹی چھوٹی", category: "Bakery & Biscuits", brand: "Dawn", unit: "piece", cost: 110, sale: 130, stock: 40 },
    { nameEn: "Dawn Cake Rusk 400g Box", nameUr: "ڈان کیک رس 400 گرام", category: "Bakery & Biscuits", brand: "Dawn", unit: "piece", cost: 280, sale: 330, stock: 25 },
    { nameEn: "Peek Freans Sooper Biscuit Family Pack", nameUr: "پیک فرینز سوپر بسکٹ فیملی پیک", category: "Bakery & Biscuits", brand: "English Biscuit", unit: "piece", cost: 120, sale: 140, stock: 90 },
    { nameEn: "Peek Freans Rio Strawberry Cream", nameUr: "ریو اسٹرابیری بسکٹ", category: "Bakery & Biscuits", brand: "English Biscuit", unit: "piece", cost: 42, sale: 50, stock: 120 },
    { nameEn: "Prince Chocolate Biscuits Family Pack", nameUr: "پرنس چاکلیٹ بسکٹ فیملی پیک", category: "Bakery & Biscuits", brand: "LU", unit: "piece", cost: 125, sale: 145, stock: 85 },
    { nameEn: "Marie Biscuit Half Roll", nameUr: "میری بسکٹ ہاف رول", category: "Bakery & Biscuits", brand: "English Biscuit", unit: "piece", cost: 50, sale: 60, stock: 70 },
    { nameEn: "Gluco Biscuits Snack Pack", nameUr: "گلوکو بسکٹ", category: "Bakery & Biscuits", brand: "English Biscuit", unit: "piece", cost: 25, sale: 30, stock: 140 },

    // Personal Care & Soaps
    { nameEn: "Lux Velvet Touch Soap 140g", nameUr: "لکس صابن مخملی 140 گرام", category: "Personal Care", brand: "Unilever", unit: "piece", cost: 150, sale: 175, stock: 80 },
    { nameEn: "Lifebuoy Total Soap 130g", nameUr: "لائف بوائے صابن 130 گرام", category: "Personal Care", brand: "Unilever", unit: "piece", cost: 130, sale: 155, stock: 95 },
    { nameEn: "Dettol Original Soap 125g", nameUr: "ڈیٹول صابن 125 گرام", category: "Personal Care", brand: "Reckitt", unit: "piece", cost: 165, sale: 195, stock: 75 },
    { nameEn: "Safeguard Pure White Soap 130g", nameUr: "سیف گارڈ صابن 130 گرام", category: "Personal Care", brand: "P&G", unit: "piece", cost: 160, sale: 185, stock: 85 },
    { nameEn: "Sunsilk Black Shine Shampoo 180ml", nameUr: "سن سلک شیمپو کالا 180 ملی لیٹر", category: "Personal Care", brand: "Unilever", unit: "piece", cost: 380, sale: 440, stock: 40 },
    { nameEn: "Head & Shoulders Classic Clean 180ml", nameUr: "ہیڈ اینڈ شولڈرز شیمپو 180 ملی", category: "Personal Care", brand: "P&G", unit: "piece", cost: 440, sale: 510, stock: 35 },
    { nameEn: "Colgate Maximum Cavity Protection 100g", nameUr: "کولگیٹ ٹوتھ پیسٹ 100 گرام", category: "Personal Care", brand: "Colgate", unit: "piece", cost: 220, sale: 260, stock: 65 },
    { nameEn: "Sensodyne Rapid Relief 100g", nameUr: "سینسوڈائن ریپڈ ریلیف ٹوتھ پیسٹ", category: "Personal Care", brand: "GSK", unit: "piece", cost: 420, sale: 490, stock: 30 },
    { nameEn: "Tibet Snow Cream 45g", nameUr: "تبت سنو کریم 45 گرام", category: "Personal Care", brand: "Tibet", unit: "piece", cost: 130, sale: 160, stock: 50 },

    // Cleaning & Detergents
    { nameEn: "Surf Excel Washing Powder 1kg Pouch", nameUr: "سرف ایکسل 1 کلو پاؤچ", category: "Household & Cleaning", brand: "Unilever", unit: "piece", cost: 630, sale: 710, stock: 60 },
    { nameEn: "Ariel Washing Powder 1kg Box", nameUr: "ایریل واشنگ پاؤڈر 1 کلو ڈبہ", category: "Household & Cleaning", brand: "P&G", unit: "piece", cost: 650, sale: 730, stock: 50 },
    { nameEn: "Bonus Tristar Detergent 1kg", nameUr: "بونس ٹرائی اسٹار 1 کلو", category: "Household & Cleaning", brand: "Colgate-Palmolive", unit: "piece", cost: 340, sale: 390, stock: 70 },
    { nameEn: "Lemon Max Dishwash Bar 150g", nameUr: "لیمن میکس بار 150 گرام", category: "Household & Cleaning", brand: "Colgate-Palmolive", unit: "piece", cost: 55, sale: 70, stock: 130 },
    { nameEn: "Lemon Max Liquid Dishwash 475ml", nameUr: "لیمن میکس برتن دھونے کا مائع 475 ملی", category: "Household & Cleaning", brand: "Colgate-Palmolive", unit: "piece", cost: 290, sale: 340, stock: 35 },
    { nameEn: "Vim Dishwash Bar 125g", nameUr: "وم صابن برتن دھونے والا", category: "Household & Cleaning", brand: "Unilever", unit: "piece", cost: 50, sale: 65, stock: 110 },
    { nameEn: "Harpic Power Plus 500ml", nameUr: "ہارپک ٹوائلٹ کلینر 500 ملی", category: "Household & Cleaning", brand: "Reckitt", unit: "piece", cost: 260, sale: 310, stock: 45 },
    { nameEn: "Kingtox Mosquito Insect Killer Spray 400ml", nameUr: "کنگ ٹاکس مچھر مار اسپرے", category: "Household & Cleaning", brand: "Kingtox", unit: "piece", cost: 420, sale: 490, stock: 40 },

    // Beverages & Cold Drinks
    { nameEn: "Rooh Afza 800ml Bottle", nameUr: "روح افزا شربت 800 ملی لیٹر", category: "Tea & Beverages", brand: "Hamdard", unit: "piece", cost: 380, sale: 440, stock: 60 },
    { nameEn: "Jam-e-Shirin 800ml Bottle", nameUr: "جام شیریں 800 ملی لیٹر", category: "Tea & Beverages", brand: "Qarshi", unit: "piece", cost: 370, sale: 430, stock: 55 },
    { nameEn: "Coca Cola 1.5 Litre Bottle", nameUr: "کوکا کولا 1.5 لیٹر بوتل", category: "Tea & Beverages", brand: "Coca-Cola", unit: "piece", cost: 175, sale: 200, stock: 80 },
    { nameEn: "Sprite 1.5 Litre Bottle", nameUr: "اسپرائٹ 1.5 لیٹر بوتل", category: "Tea & Beverages", brand: "Coca-Cola", unit: "piece", cost: 175, sale: 200, stock: 75 },
    { nameEn: "Pakola Ice Cream Soda 1.5L", nameUr: "پاکولہ آئس کریم سوڈا 1.5 لیٹر", category: "Tea & Beverages", brand: "Pakola", unit: "piece", cost: 160, sale: 190, stock: 45 },
    { nameEn: "Nestle Pure Life Mineral Water 1.5L", nameUr: "نسلے منرل واٹر 1.5 لیٹر", category: "Tea & Beverages", brand: "Nestle", unit: "piece", cost: 95, sale: 120, stock: 120 },

    // Snacks & Confectionery
    { nameEn: "Lays French Cheese Crisps 45g", nameUr: "لیز فرینچ چیز چپس 45 گرام", category: "Snacks & Sweets", brand: "Lays", unit: "piece", cost: 68, sale: 80, stock: 110 },
    { nameEn: "Lays Masala Crisps 45g", nameUr: "لیز مسالہ چپس 45 گرام", category: "Snacks & Sweets", brand: "Lays", unit: "piece", cost: 68, sale: 80, stock: 115 },
    { nameEn: "Kolson Slanty Jalapeno 35g", nameUr: "کولسن سلانٹی ہلاپینو 35 گرام", category: "Snacks & Sweets", brand: "Kolson", unit: "piece", cost: 42, sale: 50, stock: 100 },
    { nameEn: "Kurkure Red Chilli Jhatka 40g", nameUr: "کرکرے لال مرچ 40 گرام", category: "Snacks & Sweets", brand: "Kurkure", unit: "piece", cost: 42, sale: 50, stock: 90 },
    { nameEn: "Super Crisp Salted Crisps 40g", nameUr: "سپر کرسپ نمک چپس 40 گرام", category: "Snacks & Sweets", brand: "Super Crisp", unit: "piece", cost: 42, sale: 50, stock: 80 },
    { nameEn: "Cadbury Dairy Milk 38g Bar", nameUr: "کیڈبری ڈیری ملک چاکلیٹ 38 گرام", category: "Snacks & Sweets", brand: "Cadbury", unit: "piece", cost: 130, sale: 160, stock: 75 },
    { nameEn: "Candyland Chilli Mili Jelly Pack", nameUr: "کینڈی لینڈ چلی ملی جیلی", category: "Snacks & Sweets", brand: "Candyland", unit: "piece", cost: 25, sale: 30, stock: 150 },
    { nameEn: "Hilal Ding Dong Bubble Gum (Box of 24)", nameUr: "ہلال ڈنگ ڈونگ ببل گم ڈبہ", category: "Snacks & Sweets", brand: "Hilal", unit: "piece", cost: 210, sale: 260, stock: 35 },
  ];

  const allProductsData = [];
  const stockMovementsData = [];
  let barcodeCounter = 896400010001;

  for (let i = 0; i < baseItems.length; i++) {
    const item = baseItems[i];
    const barcodeStr = String(barcodeCounter++);
    let sum = 0;
    for (let c = 0; c < 12; c++) {
      const d = parseInt(barcodeStr[c], 10);
      sum += c % 2 === 0 ? d * 1 : d * 3;
    }
    const cd = (10 - (sum % 10)) % 10;
    const finalBarcode = `${barcodeStr}${cd}`;
    const prodId = crypto.randomUUID();

    allProductsData.push({
      id: prodId,
      nameEn: item.nameEn,
      nameUr: item.nameUr,
      sku: `KIR-${1000 + i}`,
      primaryBarcode: finalBarcode,
      category: item.category,
      brand: item.brand,
      unit: item.unit,
      costPaisa: item.cost * 100,
      salePricePaisa: item.sale * 100,
      mrpPaisa: Math.round(item.sale * 1.05) * 100,
      reorderLevel: item.unit === "kg" ? 50 : 15,
      isActive: true,
    });

    stockMovementsData.push({
      id: crypto.randomUUID(),
      productId: prodId,
      quantityDelta: item.stock,
      type: StockMovementType.PURCHASE_RECEIPT,
      costPaisa: item.cost * 100,
      reason: "Initial store catalog stock take",
      createdById: owner.id,
    });
  }

  // Expand with variations to ensure 275+ SKUs
  const categoriesList = ["Tea & Beverages", "Dairy & Eggs", "Spices & Recipe Mix", "Oil & Ghee", "Grains & Pulses", "Bakery & Biscuits", "Personal Care", "Household & Cleaning", "Snacks & Sweets"];
  for (let cIdx = 0; cIdx < categoriesList.length; cIdx++) {
    const cat = categoriesList[cIdx];
    for (let sub = 1; sub <= 24; sub++) {
      const barcodeStr = String(barcodeCounter++);
      let sum = 0;
      for (let c = 0; c < 12; c++) {
        const d = parseInt(barcodeStr[c], 10);
        sum += c % 2 === 0 ? d * 1 : d * 3;
      }
      const cd = (10 - (sum % 10)) % 10;
      const finalBarcode = `${barcodeStr}${cd}`;
      const prodId = crypto.randomUUID();

      const cost = 45 + (sub * 30) + (cIdx * 15);
      const sale = Math.round(cost * 1.18);

      allProductsData.push({
        id: prodId,
        nameEn: `${cat} Standard Pack #${sub}`,
        nameUr: `${cat} معیاری پیکٹ نمبر ${sub}`,
        sku: `SKU-${cIdx + 1}${String(sub).padStart(3, "0")}`,
        primaryBarcode: finalBarcode,
        category: cat,
        brand: "Bismillah Wholesale",
        unit: "piece",
        costPaisa: cost * 100,
        salePricePaisa: sale * 100,
        mrpPaisa: Math.round(sale * 1.05) * 100,
        reorderLevel: 10,
        isActive: true,
      });

      stockMovementsData.push({
        id: crypto.randomUUID(),
        productId: prodId,
        quantityDelta: 30 + (sub % 20),
        type: StockMovementType.PURCHASE_RECEIPT,
        costPaisa: cost * 100,
        reason: "Initial warehouse receiving",
        createdById: owner.id,
      });
    }
  }

  console.log(`Inserting ${allProductsData.length} products in batch...`);
  await prisma.product.createMany({ data: allProductsData });
  await prisma.stockLedger.createMany({ data: stockMovementsData });
  console.log("Products and stock movements batch inserted!");

  // 6. Create Active Shift for cashier
  const activeShift = await prisma.shift.create({
    data: {
      cashierId: cashier.id,
      openingFloatPaisa: 500000, // Rs 5,000 float
      status: "OPEN",
    },
  });

  // 7. Seed Past 30 Days of Sales using Batch Transactions
  console.log("Seeding sales history batch...");
  const paymentMethods = [PaymentMethod.CASH, PaymentMethod.CASH, PaymentMethod.JAZZCASH, PaymentMethod.EASYPAISA, PaymentMethod.RAAST_QR, PaymentMethod.KHATA_UDHAAR];
  const now = new Date();
  let receiptCounter = 1001;

  for (let day = 30; day >= 0; day -= 2) {
    const saleDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const daySales = [];
    const dayPayments = [];
    const dayItems = [];
    const dayDeductions = [];

    const salesToday = day === 0 ? 6 : 8;
    for (let s = 0; s < salesToday; s++) {
      const saleId = crypto.randomUUID();
      const receiptNo = `REC-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, "0")}${String(receiptCounter++)}`;
      const method = paymentMethods[(day + s) % paymentMethods.length];
      const customer = method === PaymentMethod.KHATA_UDHAAR ? customers[s % customers.length] : null;

      let subtotal = 0;
      const basketSize = 2 + ((s + day) % 4);
      for (let itm = 0; itm < basketSize; itm++) {
        const prod = allProductsData[(day * 5 + s * 3 + itm) % allProductsData.length];
        const qty = prod.unit === "kg" ? 1 + (itm % 2) * 0.5 : 1 + (itm % 3);
        const itemTotal = Math.round(prod.salePricePaisa * qty);
        subtotal += itemTotal;

        dayItems.push({
          id: crypto.randomUUID(),
          saleId,
          productId: prod.id,
          unit: prod.unit,
          quantity: qty,
          unitPricePaisa: prod.salePricePaisa,
          totalPaisa: itemTotal,
        });

        dayDeductions.push({
          id: crypto.randomUUID(),
          productId: prod.id,
          quantityDelta: -qty,
          type: StockMovementType.SALE,
          referenceId: saleId,
          costPaisa: Math.round(prod.salePricePaisa * 0.85),
          reason: `Retail Checkout Sale ${receiptNo}`,
          createdAt: saleDate,
          createdById: cashier.id,
        });
      }

      daySales.push({
        id: saleId,
        clientTxId: `tx-${receiptNo}`,
        receiptNumber: receiptNo,
        shiftId: activeShift.id,
        cashierId: cashier.id,
        customerId: customer?.id || null,
        subtotalPaisa: subtotal,
        totalPaisa: subtotal,
        status: "COMPLETED",
        fbrStatus: FbrStatus.SUCCESS,
        fbrInvoiceNumber: `100101-${saleDate.toISOString().slice(2, 10).replace(/-/g, "")}-${String(receiptCounter).padStart(4, "0")}-7`,
        createdAt: saleDate,
      });

      dayPayments.push({
        id: crypto.randomUUID(),
        saleId,
        method,
        amountPaisa: subtotal,
        tenderPaisa: method === PaymentMethod.CASH ? Math.ceil(subtotal / 50000) * 50000 : subtotal,
        changePaisa: method === PaymentMethod.CASH ? Math.max(0, (Math.ceil(subtotal / 50000) * 50000) - subtotal) : 0,
        createdAt: saleDate,
      });
    }

    await prisma.sale.createMany({ data: daySales });
    await prisma.saleItem.createMany({ data: dayItems });
    await prisma.payment.createMany({ data: dayPayments });
    await prisma.stockLedger.createMany({ data: dayDeductions });
  }

  console.log("Database seeded successfully in batch mode!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
