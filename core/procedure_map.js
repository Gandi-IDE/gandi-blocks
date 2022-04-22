'use strict';

goog.provide('Blockly.ProcedureMap');

// goog.require('Blockly.Events.VarDelete');
// goog.require('Blockly.Events.VarRename');
// goog.require('Blockly.VariableModel');
Blockly.ProcedureMap = function(workspace) {
  this.procedureMap_ = {};
  this.workspace =   this.workspace = workspace;
};

Blockly.ProcedureMap.prototype.clear = function() {
  this.procedureMap_ = new Object(null);
};

Blockly.ProcedureMap.prototype.createProcedureMutation = function(mutation) {
  var proccode = mutation.getAttribute('proccode');
  if (proccode) {
    this.procedureMap_[proccode] = mutation;
  }
};

Blockly.ProcedureMap.prototype.getAllProcedureMutations = function() {
  return Object.values(this.procedureMap_);
};

Blockly.ProcedureMap.prototype.getProcedureMutationByProccode = function(proccode) {
  return this.procedureMap_[proccode];
};
