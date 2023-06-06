import { test, expect } from "vitest";
import { models, actions } from "@teamkeel/testing";

test("permissions example", async () => {
  const identityStudentA = await models.identity.create({});
  const identityStudentB = await models.identity.create({});
  const identityStudentC = await models.identity.create({});

  const identityTeacherA = await models.identity.create({});
  const identityTeacherB = await models.identity.create({});

  const studentA = await actions.withIdentity(identityStudentA).createStudent({
    user: {
      name: "Student A",
    },
  });
  const studentB = await actions.withIdentity(identityStudentB).createStudent({
    user: {
      name: "Student B",
    },
  });
  const studentC = await actions.withIdentity(identityStudentC).createStudent({
    user: {
      name: "Student C",
    },
  });

  const teacherA = await actions.withIdentity(identityTeacherA).createTeacher({
    user: {
      name: "Teacher A",
    },
  });
  const teacherB = await actions.withIdentity(identityTeacherB).createTeacher({
    user: {
      name: "Teacher B",
    },
  });

  // Students can't create classes
  await expect(
    actions.withIdentity(identityStudentA).createClass({
      name: "Algebra",
      teacher: {
        id: teacherA.id,
      },
    })
  ).toHaveAuthorizationError();

  const algebraClass = await actions
    .withIdentity(identityTeacherA)
    .createClass({
      name: "Algebra",
      teacher: {
        id: teacherA.id,
      },
    });

  for (const s of [studentA, studentB, studentC]) {
    await actions.withIdentity(identityTeacherA).addStudentToClass({
      student: {
        id: s.id,
      },
      class: {
        id: algebraClass.id,
      },
    });
  }

  const statisticsClass = await actions
    .withIdentity(identityTeacherA)
    .createClass({
      name: "Statistics",
      teacher: {
        id: teacherA.id,
      },
    });

  await actions.withIdentity(identityTeacherA).addStudentToClass({
    student: {
      id: studentA.id,
    },
    class: {
      id: statisticsClass.id,
    },
  });

  const geometryClass = await actions
    .withIdentity(identityTeacherB)
    .createClass({
      name: "Geometry",
      teacher: {
        id: teacherB.id,
      },
    });

  await actions.withIdentity(identityTeacherB).addStudentToClass({
    student: {
      id: studentB.id,
    },
    class: {
      id: geometryClass.id,
    },
  });

  // Teacher A can see all three students
  const teacherAStudents = await actions
    .withIdentity(identityTeacherA)
    .teacherStudents({
      where: {
        classesClassTeacherId: {
          equals: teacherA.id,
        },
      },
    });
  expect(teacherAStudents.results).toHaveLength(3);

  // Teacher B can see only student B
  const teacherBStudents = await actions
    .withIdentity(identityTeacherB)
    .teacherStudents({
      where: {
        classesClassTeacherId: {
          equals: teacherB.id,
        },
      },
    });
  expect(teacherBStudents.results).toHaveLength(1);
  expect(teacherBStudents.results[0].userId).toEqual(studentB.userId);

  // Teacher A can see both classes student B takes even they only teach one of them
  let studentBClasses = await actions
    .withIdentity(identityTeacherA)
    .studentClasses({
      where: {
        studentsStudentId: {
          equals: studentB.id,
        },
      },
    });
  expect(studentBClasses.results).toHaveLength(2);

  // Teacher B can see both classes student B takes even they only teach one of them
  studentBClasses = await actions
    .withIdentity(identityTeacherB)
    .studentClasses({
      where: {
        studentsStudentId: {
          equals: studentB.id,
        },
      },
    });
  expect(studentBClasses.results).toHaveLength(2);

  // Teacher B is not allowed to see student A's classes as teacher B does not teach student A
  await expect(
    actions.withIdentity(identityTeacherB).studentClasses({
      where: {
        studentsStudentId: {
          equals: studentA.id,
        },
      },
    })
  ).toHaveAuthorizationError();
});
