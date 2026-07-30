import { writeBatch, doc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { faker } from '@faker-js/faker';

// Define constraints
const DEPARTMENTS = [
  'Computer Science Engineering (CSE)',
  'Artificial Intelligence & Data Science (AI&DS)',
  'Information Technology (IT)',
  'Electronics & Communication Engineering (ECE)',
  'Electrical Engineering (EEE)',
  'Mechanical Engineering',
  'Civil Engineering',
  'MBA',
  'MCA'
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const YEARS = ['1', '2', '3', '4'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'];

const SUBJECTS_POOL = [
  'Programming in C', 'Java Programming', 'Python', 'Operating Systems', 'DBMS', 
  'Computer Networks', 'Machine Learning', 'Artificial Intelligence', 'Data Structures', 
  'Cloud Computing', 'Software Engineering', 'Web Technologies', 'Digital Logic', 
  'Mathematics', 'Physics', 'Chemistry'
];

const STUDENTS_COUNT = 1000;
const FACULTY_COUNT = 80;
const DAYS_TO_SEED = 7; // Changed from 30 to 7 to prevent hitting Firebase 20k free tier quota

const chunkArray = (arr, size) => {
  const chunked = [];
  for (let i = 0; i < arr.length; i += size) {
    chunked.push(arr.slice(i, i + size));
  }
  return chunked;
};

const executeBatches = async (dataArray, collectionName, onProgress) => {
  const chunks = chunkArray(dataArray, 400); // 400 to be safe under 500 limit
  let totalWritten = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const batch = writeBatch(db);
    chunk.forEach(item => {
      const ref = doc(db, collectionName, item.id || doc(collection(db, collectionName)).id);
      batch.set(ref, item);
    });
    await batch.commit();
    totalWritten += chunk.length;
    if (onProgress) onProgress(`Wrote ${totalWritten}/${dataArray.length} ${collectionName}...`);
  }
};

export const checkDataExists = async () => {
  const q = query(collection(db, 'students'), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
};

export const generateUniversityData = async (onProgress) => {
  try {
    // 1. Generate Departments & Subjects
    if (onProgress) onProgress("Generating Departments and Subjects...");
    const departmentsData = DEPARTMENTS.map(name => ({ id: name.replace(/\s+/g, '_').toLowerCase(), name }));
    await executeBatches(departmentsData, 'departments', null);

    // Create realistic subjects
    const subjectsData = [];
    DEPARTMENTS.forEach(dept => {
      const numSubjects = faker.number.int({ min: 5, max: 10 });
      for (let i = 0; i < numSubjects; i++) {
        subjectsData.push({
          id: faker.string.uuid(),
          name: faker.helpers.arrayElement(SUBJECTS_POOL) + ' ' + faker.number.int({min: 1, max: 5}),
          department: dept,
          credits: faker.number.int({ min: 1, max: 4 })
        });
      }
    });
    await executeBatches(subjectsData, 'subjects', null);

    // 2. Generate Faculty
    if (onProgress) onProgress("Generating Faculty...");
    const facultyData = [];
    for (let i = 0; i < FACULTY_COUNT; i++) {
      const dept = faker.helpers.arrayElement(DEPARTMENTS);
      const facultySubjects = faker.helpers.arrayElements(subjectsData.filter(s => s.department === dept), { min: 2, max: 5 });
      const fId = faker.string.uuid();
      
      facultyData.push({
        id: fId,
        uid: fId,
        facultyId: `FAC${faker.number.int({min: 1000, max: 9999})}`,
        employeeId: faker.string.alphanumeric(10).toUpperCase(),
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        phone: faker.phone.number('##########'),
        department: dept,
        designation: faker.helpers.arrayElement(['Professor', 'Associate Professor', 'Assistant Professor']),
        qualification: faker.helpers.arrayElement(['Ph.D', 'M.Tech', 'M.Sc']),
        experience: `${faker.number.int({min: 1, max: 20})} Years`,
        profileImage: faker.image.avatar(),
        role: 'faculty',
        status: 'active',
        assignedSubjects: facultySubjects.map(s => s.name)
      });
    }
    await executeBatches(facultyData, 'faculty', onProgress);

    // 3. Generate Timetable (Mappings)
    if (onProgress) onProgress("Generating Timetables...");
    const timetableData = [];
    DEPARTMENTS.forEach(dept => {
      YEARS.forEach(year => {
        SECTIONS.forEach(section => {
          const deptFaculty = facultyData.filter(f => f.department === dept);
          if (deptFaculty.length === 0) return;
          
          DAYS.forEach(day => {
            PERIODS.forEach((period, idx) => {
              const faculty = faker.helpers.arrayElement(deptFaculty);
              const subject = faculty.assignedSubjects.length > 0 ? faker.helpers.arrayElement(faculty.assignedSubjects) : 'General Study';
              timetableData.push({
                id: `${dept.replace(/\s+/g, '_')}_${year}_${section}_${day}_${idx + 1}`,
                department: dept,
                year,
                section,
                day,
                period,
                periodNumber: idx + 1,
                facultyId: faculty.uid,
                facultyName: faculty.name,
                subject
              });
            });
          });
        });
      });
    });
    await executeBatches(timetableData, 'timetable', null);

    // 4. Generate Students
    if (onProgress) onProgress("Generating Students...");
    const studentsData = [];
    const faceEmbeddingsData = [];
    let cseCount = 1;
    
    for (let i = 0; i < STUDENTS_COUNT; i++) {
      const dept = faker.helpers.arrayElement(DEPARTMENTS);
      const year = faker.helpers.arrayElement(YEARS);
      const section = faker.helpers.arrayElement(SECTIONS);
      const sId = faker.string.uuid();
      
      const deptCode = dept.split(' ')[0].substring(0, 3).toUpperCase();
      const studentId = `23${deptCode}${cseCount.toString().padStart(4, '0')}`;
      cseCount++;

      studentsData.push({
        id: sId,
        uid: sId,
        studentId,
        universityRollNumber: faker.string.alphanumeric(12).toUpperCase(),
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        phone: faker.phone.number('##########'),
        gender: faker.person.sex(),
        department: dept,
        year,
        section,
        semester: (parseInt(year) * 2 - 1).toString(),
        profileImage: faker.image.avatar(),
        attendancePercentage: faker.number.int({ min: 60, max: 100 }),
        registrationDate: faker.date.past().toISOString(),
        status: 'active',
        faceRegistrationStatus: 'completed',
        guardianName: faker.person.fullName(),
        guardianPhone: faker.phone.number('##########'),
        bloodGroup: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
        dateOfBirth: faker.date.birthdate({ min: 18, max: 25, mode: 'age' }).toISOString(),
        address: faker.location.streetAddress(),
        role: 'student'
      });

      // Dummy face embedding
      const fakeEmbedding = Array.from({length: 128}, () => faker.number.float({ min: -1, max: 1 }));
      faceEmbeddingsData.push({
        id: sId,
        uid: sId,
        studentId,
        name: studentsData[i].name,
        embedding: fakeEmbedding,
        updatedAt: new Date().toISOString()
      });
    }
    await executeBatches(studentsData, 'students', onProgress);
    await executeBatches(faceEmbeddingsData, 'face_embeddings', onProgress);

    // 5. Generate Attendance History
    if (onProgress) onProgress(`Generating Attendance History (${DAYS_TO_SEED} days)...`);
    const attendanceData = [];
    
    // We only generate attendance for the past DAYS_TO_SEED days to save quota
    for (let d = 0; d < DAYS_TO_SEED; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];
      
      // Randomly select 100 students per day to simulate attendance to keep batch sizes reasonable
      const sampledStudents = faker.helpers.arrayElements(studentsData, 100);
      
      sampledStudents.forEach(student => {
        // Pick a random period from their timetable
        const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
        if (dayOfWeek === 'Sunday') return;
        
        const schedule = timetableData.filter(t => t.department === student.department && t.section === student.section && t.day === dayOfWeek);
        if (schedule.length > 0) {
          const slot = faker.helpers.arrayElement(schedule);
          
          attendanceData.push({
            id: `${student.uid}_${dateStr}_${slot.periodNumber}`,
            student_id: student.uid,
            student_name: student.name,
            faculty_id: slot.facultyId,
            faculty_name: slot.facultyName,
            department: student.department,
            section: student.section,
            subject: slot.subject,
            period: slot.periodNumber,
            date: dateStr,
            status: faker.helpers.arrayElement(['Present', 'Present', 'Present', 'Absent', 'Late']), // higher chance of present
            timestamp: new Date(date),
            confidenceScore: faker.number.int({ min: 80, max: 99 })
          });
        }
      });
    }
    await executeBatches(attendanceData, 'attendance', onProgress);

    // 6. Generate Notifications
    if (onProgress) onProgress("Generating Notifications...");
    const notificationsData = [
      { id: 'n1', title: 'Mid Semester Exams', message: 'Mid sem exams starting from next week.', type: 'exam', date: new Date().toISOString() },
      { id: 'n2', title: 'Holiday Notice', message: 'College will remain closed on Friday for public holiday.', type: 'holiday', date: new Date().toISOString() },
      { id: 'n3', title: 'Attendance Warning', message: 'Students below 75% attendance will be detained.', type: 'warning', date: new Date().toISOString() }
    ];
    await executeBatches(notificationsData, 'notifications', null);

    if (onProgress) onProgress("University Data Seeding Completed Successfully! 🎉");

  } catch (error) {
    console.error("Seeding Error:", error);
    if (onProgress) onProgress(`Error: ${error.message}`);
    throw error;
  }
};
