const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // First, check if we have schools (from your previous seeds)
  const schoolCount = await prisma.school.count();
  if (schoolCount === 0) {
    console.log('No schools found. Please add schools first through the web interface.');
    return;
  }

  // Get the first school ID to use for instructor and student
  const firstSchool = await prisma.school.findFirst();
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Check if demo users already exist
  const existingDirector = await prisma.user.findUnique({
    where: { email: 'director@program.edu' }
  });
  
  if (existingDirector) {
    console.log('Demo users already exist, updating their status to approved...');
    
    // Update existing demo users to approved status
    await prisma.user.updateMany({
      where: {
        email: {
          in: ['director@program.edu', 'instructor@lincoln.edu', 'student@lincoln.edu']
        }
      },
      data: {
        status: 'approved'
      }
    });
    console.log('Updated demo users to approved status!');
    
  } else {
    console.log('Creating demo users...');
    
    // Create demo users one by one with approved status
    try {
      await prisma.user.create({
        data: {
          email: 'director@program.edu',
          password: hashedPassword,
          name: 'Dr. Program Director',
          role: 'director',
          status: 'approved',
          schoolId: null
        }
      });

      await prisma.user.create({
        data: {
          email: 'instructor@lincoln.edu',
          password: hashedPassword,
          name: 'Dr. Sarah Johnson',
          role: 'instructor',
          status: 'approved',
          schoolId: firstSchool.id
        }
      });

      await prisma.user.create({
        data: {
          email: 'student@lincoln.edu',
          password: hashedPassword,
          name: 'John Smith',
          role: 'student',
          status: 'approved',
          schoolId: firstSchool.id
        }
      });
      
      console.log('Created demo users with approved status!');
    } catch (error) {
      console.log('Error creating users:', error.message);
    }
  }
  
  // Add default analysis questions (if they don't exist)
  const existingQuestions = await prisma.analysisQuestion.findMany();
  if (existingQuestions.length === 0) {
    console.log('Creating default analysis questions...');
    
    await prisma.analysisQuestion.createMany({
      data: [
        {
          id: 'seq_readable',
          step: 'clone-editing',
          text: 'Is the sequence readable?',
          type: 'yes_no',
          required: true,
          order: 1
        },
        {
          id: 'seq_quality_good',
          step: 'clone-editing', 
          text: 'Is the sequence quality good enough for analysis?',
          type: 'yes_no',
          required: true,
          order: 2
        },
        {
          id: 'blast_database',
          step: 'blast',
          text: 'Which BLAST database should be used?',
          type: 'select',
          options: JSON.stringify(['NCBI nr/nt', 'RefSeq', 'UniProt', 'Custom']),
          required: true,
          order: 1
        },
        {
          id: 'analysis_complete',
          step: 'analysis-submission',
          text: 'Have you completed your sequence analysis?',
          type: 'yes_no',
          required: true,
          order: 1
        }
      ]
    });
    console.log('Created default analysis questions!');
  } else {
    console.log('Analysis questions already exist, skipping creation.');
  }

  console.log('Database seeding completed successfully!');
  console.log('\nDemo account credentials:');
  console.log('Director: director@program.edu / password123');
  console.log('Instructor: instructor@lincoln.edu / password123');
  console.log('Student: student@lincoln.edu / password123');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
  })
  .finally(() => prisma.$disconnect());