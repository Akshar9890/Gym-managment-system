import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding initial data...");

  // Create SUPER_ADMIN user (change password immediately after setup)
  const passwordHash = await bcrypt.hash("BSFAdmin@2024!", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@bsfgym.com" },
    update: {},
    create: {
      email: "admin@bsfgym.com",
      name: "BSF Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ Super admin created: ${superAdmin.email}`);

  // Seed default membership plans
  const plans = [
    { name: "1 Month", durationMonths: 1, price: 1000 },
    { name: "3 Months", durationMonths: 3, price: 2200 },
    { name: "6 Months", durationMonths: 6, price: 4000 },
    { name: "1 Year", durationMonths: 12, price: 7000 },
  ];



  // Use findFirst + create pattern instead for plans
  for (const plan of plans) {
    const existing = await prisma.membershipPlan.findFirst({
      where: { name: plan.name },
    });
    if (!existing) {
      await prisma.membershipPlan.create({
        data: {
          name: plan.name,
          durationMonths: plan.durationMonths,
          price: plan.price,
          description: `${plan.name} membership at BSF THE GYM`,
          isActive: true,
        },
      });
      console.log(`✅ Plan created: ${plan.name}`);
    } else {
      console.log(`⏭  Plan already exists: ${plan.name}`);
    }
  }

  console.log("\n✅ Seed complete!");
  console.log("📧 Login: admin@bsfgym.com");
  console.log("🔑 Password: BSFAdmin@2024!");
  console.log("⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY AFTER FIRST LOGIN!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
