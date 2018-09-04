const _ = require('lodash');
const jsonfile = require('jsonfile');
const dialog = require('electron').remote.dialog;
const ipcRenderer = require('electron').ipcRenderer;

const path = require('path');
const randomName = require('random-name');

// const csv = require('csvtojson');
// const fs = require('fs')

const $ = window.$;

// const studentsJsonFilePath = path.resolve(__dirname, 'data/students.json');
let openedFilePath = null;
let students = [];
let student = null;

function start () {
  $().ready(() => {
    onEnter('#studentId', gotoStudent)
    $('#gotoStudent').click(gotoStudent)
    onEnter('#searchStudentName', findStudent)
    $('#findStudent').click(findStudent)

    onEnter('#toGroup', addStudentToGroup);
    $('#addStudentToGroup').click(addStudentToGroup);
    onTextChange('#studentIssues textarea', saveStudentIssues);

    $('body').hide();

    initializeView();

    // configure what happens when the window is closed
    $(window).on('beforeunload ', onWindowClose);

    // configure menus
    ipcRenderer.on('loadstudents', function (event) {
      let openFileOptions = {
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


  })
}

function initializeView() {
  $('#groups').hide();
  $('#addToGroup').hide();
  $('#targetGroupSection').hide();

  clearGotoStudent();
  clearFindStudent();
}

function onWindowClose() {
  saveStudents();
}

function onEnter(selector, callback) {
  $(selector).on('keypress', function (e) {
       if(e.which === 13){
          //Disable textbox to prevent multiple submit
          $(this).attr("disabled", "disabled");
          //Do Stuff, submit, etc..
          callback()
          //Enable the textbox again if needed.
          $(this).removeAttr("disabled");
       }
 });
}

function onTextChange(selector, callback) {
  $(selector).on('change keyup paste', function (e) {
        callback();
  });
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
          message: 'The file was successfully loaded.'
      });
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

function createDemoStudents(studentCount, schoolCount, minGrade, maxGrade) {
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
  console.log(students, 'createDemoStudents')
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
      $('#foundStudents').html('No students found.');
      $('#targetGroupSection').hide();
      $('#searchStudentName').focus();
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

start();
