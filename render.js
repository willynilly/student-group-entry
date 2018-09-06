const _ = require('lodash');
const jsonfile = require('jsonfile');
const dialog = require('electron').remote.dialog;
const ipcRenderer = require('electron').ipcRenderer;

const path = require('path');
const randomName = require('random-name');
const { onTextChange, onEnter } = require('./ui_helpers.js');

// const csv = require('csvtojson');
// const fs = require('fs')

const $ = window.$;

let openedFilePath = null;
let students = [];
let student = null;

function start () {
  //saveDemoStudents();

  $().ready(() => {

    configureFormElements();

    $('body').hide();

    initializeView();

    // configure what happens when the window is closed
    $(window).on('beforeunload ', onWindowClose);

    // configure menus
    configureMenus();

  })
}

function configureFormElements() {
  $('#studentId').focus(() => {
    saveStudents();
    clearGotoStudent();
  });
  onEnter($, '#studentId', gotoStudent)
  $('#gotoStudent').click(gotoStudent)
  onEnter($, '#searchStudentName', findStudent)
  $('#findStudent').click(findStudent)

  onEnter($, '#toGroup', addStudentToGroup);
  $('#addStudentToGroup').click(addStudentToGroup);
  onTextChange($, '#studentIssues textarea', saveStudentIssues);
}

function configureMenus() {
  ipcRenderer.on('loadstudents', function (event) {
    let openFileOptions = {
      title: 'Select Student Data JSON File',
      filters: [
        {name: 'JSON', extensions: ['json']}
      ]
    };
    dialog.showOpenDialog(openFileOptions, loadStudents)
  });

  ipcRenderer.on('about', function (event) {
    dialog.showMessageBox({
        title: 'About',
        message: 'This application helps researchers enter sociometric data about groups.  It was created by Will Riley.'
    });
  });

  ipcRenderer.on('exportsamegroupvectors', function (event) {
    let openFileOptions = {
      title: 'Select Folder For Exporting Same Group Vectors',
      properties: ['openDirectory', 'createDirectory']
    };
    dialog.showOpenDialog(openFileOptions, exportSameGroupVectors)
  });
}

function initializeView() {
  $('#groups').hide();
  $('#addToGroup').hide();
  $('#targetGroupSection').hide();

  clearGotoStudent();
}

function onWindowClose() {
  saveStudents();
}

function displayStudentIssues() {
  $('#studentIssues textarea').val(student.issues ? student.issues : '');
  $('#studentIssues').show();
}

function saveStudentIssues() {
  if (student !== null && student !== undefined) {
    student['issues'] = $('#studentIssues textarea').val().trim();
    saveStudent();
  }
}

function loadStudents(filePaths) {
  initializeView();
  saveStudents();
  if (filePaths !== null && filePaths !== undefined && filePaths.length > 0) {
    openedFilePath = filePaths[0];
    try {
      students = jsonfile.readFileSync(openedFilePath);
      dialog.showMessageBox({
          title: 'Loaded',
          message: 'The students were successfully loaded.'
      });
      ipcRenderer.send('studentsloaded');
      $('body').show();
    } catch(e) {
      dialog.showErrorBox('Not Loaded', 'The students could not be loaded.  Please try another file.');
      openedFilePath = null;
    }
  } else {
    dialog.showErrorBox('Not Loaded', 'The students could not be loaded.  Please try another file.');
  }
}

function saveStudent() {
  if (student !== null && student !== undefined) {
    students = _.map(students, (s) => {
      if (s.id == student.id) {
        return student;
      } else {
        return s;
      }
    })
  }
}

function saveDemoStudents() {
  const demoStudentsJsonFilePath = path.resolve(__dirname, 'data/demo-students.json');

  const studentCount = 100;
  const schoolCount = 5;
  const minGrade = 4;
  const maxGrade = 5;
  const maxGroupCount = 8;
  const maxMemberCountPerGroup = 10;

  const students = createRandomStudents(studentCount, schoolCount, minGrade, maxGrade, maxGroupCount, maxMemberCountPerGroup);
  jsonfile.writeFileSync(demoStudentsJsonFilePath, students, {spaces: 2, EOL: '\r\n'})

}

function createRandomStudents(studentCount, schoolCount, minGrade, maxGrade, maxGroupCount, maxMemberCountPerGroup) {
  let students = _.times(studentCount, (i) => {
    return {
            id: i + '',
            first: randomName.first(),
            last: randomName.last(),
            school: _.random(1, schoolCount) + '',
            grade: _.random(minGrade, maxGrade) + '',
            groups: []
          };
  });
  _.each(students, (s) => {
    let studentsInSchoolAndGrade = _.filter(students, (ss) => { return ss.grade == s.grade && ss.school == s.school;});
    let numGroups = _.random(1, maxGroupCount);
    s.groups = _.times(numGroups, (gId) => {
        return {id: gId + '', members: _.map(_.sampleSize(studentsInSchoolAndGrade, _.random(2, maxMemberCountPerGroup)), (s) => { return {id: s.id}; })}
    });
  })
  return students;
}

function saveStudents() {
  saveStudent();
  if (openedFilePath !== null) {
    jsonfile.writeFileSync(openedFilePath, students, {spaces: 2, EOL: '\r\n'})
  }
}

function clearGotoStudent() {
  $('#groups').hide();
  $('#addToGroup').hide();
  $('#studentDescription').empty();
  $('#studentId').val('');
  $('#studentIssues textarea').val('');
  $('#studentIssues').hide();
  clearFindStudent();
}

function gotoStudent () {
  saveStudents();
  let studentId = $('#studentId').val().trim() + '';
  if (studentId == '') {
    clearGotoStudent();
  } else {
    student = _.find(students, {id: studentId});
    if (student !== null && student !== undefined) {
      $('#groups').show();
      $('#addToGroup').show();
      displayStudentDescription();
      displayStudentIssues();
      displayGroups();
      $('#searchStudentName').focus();
    } else {
      clearGotoStudent();
    }
  }
}

function displayStudentDescription () {
  let html = '<div>Student Id: ' + student.id + '</div>';
  html += '<div>First Name: ' + student.first + '</div>';
  html += '<div>Last Name: ' + student.last + '</div>';
  html += '<div>School: ' + student.school + '</div>';
  html += '<div>Grade Level: ' + student.grade + '</div>';
  $('#studentDescription').html(html);
}

function displayGroups () {
  $('#grouplist').empty();
  _.each(student.groups, (group) => {
    let groupElement = $('<div class="grouplistelement"><div class="groupId">Group: ' + group.id + '</div><table><tr><th>' + ['name', 'id', 'school', 'grade'].join('</th><th>') + '</th></tr></table></div>')
    let memberCountElement = $('<div class="groupMemberCount">Member Count: ' + group.members.length + '</div>')
    _.each(group.members, (groupMember) => {

      let groupMemberDetailed = _.find(students, {id: groupMember.id});
      let groupMemberElement = $('<tr class="groupMember"><td>' + [groupMemberDetailed.first + ' ' + groupMemberDetailed.last, groupMemberDetailed.id, groupMemberDetailed.school, groupMemberDetailed.grade].join('</td><td>') + '</td></tr>');
      let deleteGroupMemberElement = $('<td class="deleteGroupMember"><button>delete</button></td>');
      deleteGroupMemberElement.click(() => {
        deleteGroupMember(group, groupMember);
        displayGroups();
      });
      groupMemberElement.append(deleteGroupMemberElement);
      groupElement.find('table').append(groupMemberElement);
    });
    groupElement.append(memberCountElement);

    $('#grouplist').append(groupElement);
  });
}

function deleteGroupMember(group, groupMember) {
  student.groups = _.map(student.groups, (g) => {
    if (g.id == group.id) {
      g.members = _.filter(g.members, (m) => {
        return m.id != groupMember.id;
      })
    }
    return g;
  });
  student.groups = _.sortBy(_.filter(student.groups, (g) => {
    return g.members.length > 0;
  }), ['id'])
  saveStudent();
}

function clearFindStudent() {
  $('#searchStudentName').val('');
  $('#foundStudents').empty();
  $('#toGroup').val('');
  $('#targetGroupSection').hide();
}

function findStudent() {
  // restrict students to those that are in the same grade and school
  let searchName = $('#searchStudentName').val().trim().toLowerCase();
  if (searchName != '') {
    let foundStudents = _.filter(students, (s) => {
      let fullName = (s.first + ' ' + s.last).trim().toLowerCase();
      return fullName.includes(searchName) && s.school == student.school && s.grade == student.grade;
    })

    let foundStudentsElement = $('#foundStudents');
    if (foundStudents.length > 0) {
      $('#targetGroupSection').show();
      foundStudentsElement.html('<table><tr><th>' + ['', 'name', 'id', 'school', 'grade'].join('</th><th>') + '</th></tr></table>');
      _.each(foundStudents, (foundStudent) => {
        let foundStudentElement = $('<tr class="foundStudent"><td><input class="selectFoundStudent" name="selectFoundStudent" type="radio" /></td><td>' + [foundStudent.first + ' ' + foundStudent.last, foundStudent.id, foundStudent.school, foundStudent.grade].join('</td><td>') + '</td></tr>')
        foundStudentElement.click(() => {
          foundStudentElement.find('input').prop('checked', true);
          $('#toGroup').focus();
        })
        foundStudentsElement.find('tbody').append(foundStudentElement);
      })
      if (foundStudents.length == 1) {
        $('.foundStudent').first().click();
      }
    } else {
      $('#searchStudentName').focus();
      $('#foundStudents').html('No students found.');
      $('#targetGroupSection').hide();
    }
  } else {
    clearFindStudent();
  }
}

function addStudentToGroup() {
  let selectedFoundStudentElement = $('#foundStudents input[type=radio]:checked');
  if (selectedFoundStudentElement.length == 0) {
    dialog.showErrorBox('Invalid Input', 'Please select a student.');
    $('#searchStudentName').focus();
    return;
  }

  let toGroupId = $('#toGroup').val().trim();
  if (toGroupId.length == 0) {
    dialog.showErrorBox('Invalid Input', 'Please enter a group name.');
    $('#searchStudentName').focus();
    return;
  }

  let selectedFoundStudentId = $(selectedFoundStudentElement.parent().parent().children()[2]).text().trim();
  if (_.find(student.groups, {id: toGroupId})) {
    student.groups = _.map(student.groups, (g) => {
      if (g.id == toGroupId) {
        if (!_.find(g.members, {id: selectedFoundStudentId})) {
          g.members.push({id: selectedFoundStudentId});
          g.members = _.map(_.sortBy(_.map(g.members, (gm) => {
            return _.find(students, {id: gm.id});
          }), ['first', 'last', 'id']), (gm) => { return {id: gm.id}; });
        }
      }
      return g;
    });
  } else {
    student.groups.push({id: toGroupId, members: [{id: selectedFoundStudentId}]});
  }

  student.groups = _.sortBy(student.groups, ['id']);

  saveStudent();
  clearFindStudent();

  displayGroups();
  $('#searchStudentName').focus();
}

function exportSameGroupVectors(folderPaths) {
  $('body').hide();
  if (folderPaths !== null && folderPaths !== undefined && folderPaths.length > 0) {
    let exportFolderPath = folderPaths[0];

    try {

      let schools = _.sortBy(_.uniq(_.map(students, (s) => {return s.school;})));
      let grades = _.sortBy(_.uniq(_.map(students, (s) => {return s.grade;})));

      _.each(schools, (school) => {
        _.each(grades, (grade) => {

          let sameGroupVectors = getSameGroupVectors(school, grade);
          const sameGroupsJsonFilePath = path.resolve(exportFolderPath, 'samegroups_school_' + school + '_grade_' + grade + '.json');
          jsonfile.writeFileSync(sameGroupsJsonFilePath, sameGroupVectors, {spaces: 2, EOL: '\r\n'})

        })
      })
      dialog.showMessageBox({
          title: 'Exported',
          message: 'The same group vectors were successfully exported.'
      });
    } catch(e) {
      dialog.showErrorBox('Not Exported', 'The same group vectors could not be exported.  Please try another folder.');
      exportedFolderPath = null;
    }
  } else {
    dialog.showErrorBox('Not Exported', 'The same group vectors could not be exported.  Please try another folder.');
  }
  $('body').show();
}

function getSameGroupVectors(school, grade) {
  let sgStudents = _.filter(students, (s) => {
    return s.grade == grade && s.school == school;
  });
  let sgStudentIds = _.map(sgStudents, (s) => { return s.id; });

  let sameGroupVectors = [];
  _.each(sgStudents, (s) => {
    let sameGroupVector = {'student_id': s.id};
    let s_i = 0;
    let s_j = 0;
    for(s_i = 0;  s_i < sgStudentIds.length - 1; s_i++) {
      for(s_j = s_i + 1;  s_j < sgStudentIds.length; s_j++) {
        let sameGroupCount = _.isNil(s.groups) ? 0 : _.filter(s.groups, (g) => {
          if (_.isNil(g.members)) {
            return false;
          } else {
            return _.findIndex(g.members, {id: sgStudentIds[s_i]}) >= 0
              && _.findIndex(g.members, {id: sgStudentIds[s_j]}) >= 0;
          }
        }).length;
        sameGroupVector[sgStudentIds[s_i] + '_' + sgStudentIds[s_j]] = sameGroupCount;
      }
    }
    sameGroupVectors.push(sameGroupVector);
  })

  return sameGroupVectors;
}

start();
