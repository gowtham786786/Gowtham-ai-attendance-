const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const DEFAULT_SUBJECTS = [
  { id: "sub1", name: "Data Structures", code: "DS101" },
  { id: "sub2", name: "Java Programming", code: "JP102" },
  { id: "sub3", name: "Database Management Systems", code: "DBMS103" },
  { id: "sub4", name: "Computer Networks", code: "CN104" },
  { id: "sub5", name: "Operating Systems", code: "OS105" },
];

// Dynamic pattern mapping will be done inside main

const TIME_SLOTS = {
  "sub1": "09:00 AM - 09:50 AM",
  "sub2": "10:00 AM - 10:50 AM",
  "sub3": "11:00 AM - 11:50 AM",
  "sub4": "12:00 PM - 12:50 PM",
  "sub5": "02:00 PM - 02:50 PM",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function main() {
  console.log('[SEED] Starting Anti Gravity attendance seeder...');
  const startTime = Date.now();

  // 1. Fetch Existing Data
  let studentsSnapshot = await db.collection("students").get();
  let facultySnapshot = await db.collection("faculty").get();
  let subjectsSnapshot = await db.collection("subjects").get();

  const students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  const faculty = facultySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  let subjects = subjectsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

  if (students.length === 0) {
    console.error("[SEED] Error: No students found in database. Please register students first.");
    process.exit(1);
  }
  if (faculty.length === 0) {
    console.error("[SEED] Error: No faculty found in database. Please register faculty first.");
    process.exit(1);
  }

  // Ensure Subjects exist
  if (subjects.length < 5) {
    console.log('[SEED] Not enough subjects found. Creating defaults...');
    for (let i = subjects.length; i < 5; i++) {
      const sub = DEFAULT_SUBJECTS[i];
      await db.collection("subjects").doc(sub.id).set(sub);
      subjects.push({ uid: sub.id, ...sub });
    }
  }

  const weeklySubjects = subjects.slice(0, 5);
  const WEEKLY_PATTERN = {
    1: [weeklySubjects[0].uid, weeklySubjects[2].uid], // Monday
    2: [weeklySubjects[1].uid, weeklySubjects[3].uid], // Tuesday
    3: [weeklySubjects[0].uid, weeklySubjects[4].uid], // Wednesday
    4: [weeklySubjects[2].uid, weeklySubjects[1].uid], // Thursday
    5: [weeklySubjects[3].uid, weeklySubjects[4].uid], // Friday
  };

  // Assign subjects to faculty
  console.log('[SEED] Ensuring faculty subject assignments...');
  const facultySubjectMap = {};
  
  // Assign sub1, sub2 to faculty 0
  // Assign sub3, sub4 to faculty 1
  // Assign sub5 to faculty 2
  subjects.forEach((sub, idx) => {
    const fIdx = idx % faculty.length;
    facultySubjectMap[sub.id] = faculty[fIdx];
  });

  console.log(`[SEED] Fetched ${students.length} students, ${faculty.length} faculty, ${subjects.length} subjects`);

  // 2. Generate Date Range (Last 3 months, Mon-Fri)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const workingDays = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateStr = current.toISOString().split('T')[0];
      workingDays.push({
        date: dateStr,
        day: DAY_NAMES[dayOfWeek],
        dayOfWeek: dayOfWeek
      });
    }
    current.setDate(current.getDate() + 1);
  }

  console.log(`[SEED] Generating records for ${workingDays.length} working days...`);

  // 3. Attendance Probability Per Student
  const studentBias = {};
  let forcedBelow75 = 0;
  
  students.forEach((s, i) => {
    if (forcedBelow75 < 3) {
      studentBias[s.uid] = 0.62 + Math.random() * 0.06; // 0.62 - 0.68
      forcedBelow75++;
      console.log(`[SEED] Student ${i+1}/${students.length}: ${s.name} — bias: ${studentBias[s.uid].toFixed(2)} (below 75 zone)`);
    } else {
      studentBias[s.uid] = 0.70 + Math.random() * 0.28; // 0.70 - 0.98
      console.log(`[SEED] Student ${i+1}/${students.length}: ${s.name} — bias: ${studentBias[s.uid].toFixed(2)}`);
    }
  });

  // Track duplicates to optimize the check slightly
  console.log('[SEED] Fetching existing attendance to prevent duplicates...');
  const existingSnapshot = await db.collection("attendance").select("studentId", "date", "subjectId").get();
  const existingKeys = new Set(
    existingSnapshot.docs.map(doc => {
      const data = doc.data();
      return `${data.studentId}_${data.date}_${data.subjectId}`;
    })
  );

  // 4. Generate Records
  const allRecords = [];
  
  for (const day of workingDays) {
    const subjectsToday = WEEKLY_PATTERN[day.dayOfWeek];
    
    for (const subId of subjectsToday) {
      const subject = subjects.find(s => s.id === subId || s.uid === subId);
      if (!subject) continue;
      
      const assignedFaculty = facultySubjectMap[subId] || faculty[0];
      // Map to generic time slots based on index
      const subjIndex = weeklySubjects.findIndex(s => s.uid === subId);
      const timeSlotKeys = Object.keys(TIME_SLOTS);
      const timeSlot = TIME_SLOTS[timeSlotKeys[subjIndex]] || "09:00 AM - 09:50 AM";

      for (const student of students) {
        const key = `${student.uid}_${day.date}_${subId}`;
        if (existingKeys.has(key)) {
          continue; // Skip duplicate
        }

        const isPresent = Math.random() < studentBias[student.uid];
        
        allRecords.push({
          studentId: student.uid,
          studentName: student.name || '',
          registerNumber: student.registerNumber || student.studentId || '',
          department: student.department || '',
          branch: student.branch || '',
          year: student.year || '',
          section: student.section || '',
          subjectId: subId,
          subject: subject.name || '',
          subjectCode: subject.code || '',
          facultyId: assignedFaculty.uid,
          facultyName: assignedFaculty.name || '',
          date: day.date,
          day: day.day,
          timeSlot: timeSlot,
          status: isPresent ? "Present" : "Absent",
          markedBy: "seed_script",
          sessionId: `SEED-${day.date}-${subId}-${student.section || 'ALL'}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // 5. Batch Write
  let batch = db.batch();
  let opCount = 0;
  let totalCommitted = 0;

  console.log(`[SEED] Ready to insert ${allRecords.length} records. Committing in batches...`);

  for (const record of allRecords) {
    const ref = db.collection("attendance").doc();
    batch.set(ref, record);
    opCount++;

    if (opCount === 499) {
      await batch.commit();
      totalCommitted += opCount;
      console.log(`[BATCH] Committed ${opCount} records (Total: ${totalCommitted})`);
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    totalCommitted += opCount;
    console.log(`[BATCH] Committed final ${opCount} records (Total: ${totalCommitted})`);
  }

  // 6. Calculate & Update Students
  console.log('[SEED] Calculating student attendance percentages...');
  const updatedAttendanceSnapshot = await db.collection("attendance").get();
  
  const studentStats = {};
  students.forEach(s => {
    studentStats[s.uid] = {
      total: 0,
      present: 0,
      subjectWise: {}
    };
  });

  updatedAttendanceSnapshot.forEach(doc => {
    const data = doc.data();
    if (studentStats[data.studentId]) {
      const st = studentStats[data.studentId];
      st.total++;
      if (data.status === 'Present') st.present++;

      if (!st.subjectWise[data.subjectId]) {
        st.subjectWise[data.subjectId] = { total: 0, present: 0, absent: 0, percentage: 0 };
      }
      const subj = st.subjectWise[data.subjectId];
      subj.total++;
      if (data.status === 'Present') {
        subj.present++;
      } else {
        subj.absent++;
      }
      subj.percentage = ((subj.present / subj.total) * 100).toFixed(2);
    }
  });

  let studentsUpdated = 0;
  let studentsBelow75Count = 0;
  const below75List = [];
  let globalTotalPercent = 0;

  for (const student of students) {
    const stats = studentStats[student.uid];
    if (stats.total > 0) {
      stats.absent = stats.total - stats.present;
      const percent = (stats.present / stats.total) * 100;
      globalTotalPercent += percent;

      if (percent < 75) {
        studentsBelow75Count++;
        below75List.push(`${student.name}: ${percent.toFixed(1)}%`);
      }

      await db.collection("students").doc(student.uid).update({
        totalClasses: stats.total,
        presentCount: stats.present,
        absentCount: stats.absent,
        overallAttendance: percent.toFixed(2),
        subjectWiseAttendance: stats.subjectWise,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      studentsUpdated++;
    }
  }

  // 7. Analytics Generation
  console.log('[SEED] Generating analytics documents...');
  
  // Overall Analytics
  const avgAttendance = studentsUpdated > 0 ? (globalTotalPercent / studentsUpdated) : 0;
  const studentsAbove75 = studentsUpdated - studentsBelow75Count;
  
  await db.collection("analytics").doc("overall").set({
    totalStudents: students.length,
    totalFaculty: faculty.length,
    totalRecords: updatedAttendanceSnapshot.size,
    totalClasses: workingDays.length * 2, // Approx
    averageAttendance: avgAttendance.toFixed(2),
    studentsAbove75: studentsAbove75,
    studentsBelow75: studentsBelow75Count,
    generatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Monthly Analytics
  const monthlyStats = {};
  updatedAttendanceSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.date) return;
    const month = data.date.substring(0, 7); // YYYY-MM
    
    if (!monthlyStats[month]) {
      monthlyStats[month] = { totalRecords: 0, presentCount: 0, absentCount: 0, dailyBreakdown: {} };
    }
    const ms = monthlyStats[month];
    ms.totalRecords++;
    if (data.status === 'Present') ms.presentCount++;
    else ms.absentCount++;

    if (!ms.dailyBreakdown[data.date]) {
      ms.dailyBreakdown[data.date] = { present: 0, absent: 0, total: 0 };
    }
    const dayStat = ms.dailyBreakdown[data.date];
    dayStat.total++;
    if (data.status === 'Present') dayStat.present++;
    else dayStat.absent++;
  });

  let analyticsCount = 1; // overall
  for (const [month, stats] of Object.entries(monthlyStats)) {
    stats.percentage = ((stats.presentCount / stats.totalRecords) * 100).toFixed(2);
    stats.month = month;
    await db.collection("analytics").doc(`monthly_${month}`).set(stats);
    analyticsCount++;
  }

  // Department Analytics
  const deptStats = {};
  students.forEach(s => {
    if (!s.department) return;
    if (!deptStats[s.department]) {
      deptStats[s.department] = { students: 0, totalPercent: 0, subjects: {} };
    }
    const ds = deptStats[s.department];
    ds.students++;
    
    const stats = studentStats[s.uid];
    if (stats.total > 0) {
      ds.totalPercent += (stats.present / stats.total) * 100;
      for (const [subId, subStat] of Object.entries(stats.subjectWise)) {
        if (!ds.subjects[subId]) ds.subjects[subId] = { totalClasses: 0, presentCount: 0 };
        ds.subjects[subId].totalClasses += subStat.total;
        ds.subjects[subId].presentCount += subStat.present;
      }
    }
  });

  for (const [dept, ds] of Object.entries(deptStats)) {
    if (ds.students > 0) {
      const subjectWise = {};
      for (const [subId, sStats] of Object.entries(ds.subjects)) {
        const subName = subjects.find(s => s.id === subId || s.uid === subId)?.name || subId;
        subjectWise[subName] = {
          avgPercent: ((sStats.presentCount / sStats.totalClasses) * 100).toFixed(2),
          totalClasses: sStats.totalClasses
        };
      }
      
      await db.collection("analytics").doc(`dept_${dept}`).set({
        department: dept,
        totalStudents: ds.students,
        averageAttendance: (ds.totalPercent / ds.students).toFixed(2),
        subjectWise: subjectWise,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      analyticsCount++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SEED] ✓ Total records inserted: ${totalCommitted}`);
  console.log(`[SEED] ✓ Student documents updated: ${studentsUpdated}`);
  console.log(`[SEED] ✓ Analytics documents written: ${analyticsCount}`);
  console.log(`[SEED] ✓ Completed in ${duration} seconds`);
  console.log(`[SEED] Students below 75%: ${studentsBelow75Count} students`);
  below75List.forEach(item => console.log(`       → ${item}`));
}

main().catch(console.error);
