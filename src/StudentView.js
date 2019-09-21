/* eslint-disable no-param-reassign,dot-notation */
import React, { Component } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.min.js";

import "./StudentView.css";

import GradeTable from "./GradeTable.js";
import GradePlanner from "./GradePlanner.js";
import FutureCheckBox from "./FutureCheckBox.js";

import LoginButton from "./LoginButton.js";

let ASSIGNMENTS = [];

let LOOKUP = {};

let setSchema;
let createAssignments;

function initialize(header, scores) {
    ({ setSchema, createAssignments } = window);
    setSchema(header, scores);
    ASSIGNMENTS = createAssignments();
    LOOKUP = {};
    for (const assignment of ASSIGNMENTS) {
        initializeLookup(assignment);
    }
}

function initializeLookup(assignment) {
    LOOKUP[assignment.name] = assignment;
    if (assignment.isTopic) {
        for (const child of assignment.children) {
            initializeLookup(child);
        }
    }
}

function extend(scores) {
    const out = JSON.parse(JSON.stringify(scores));
    for (const key of Object.keys(LOOKUP)) {
        if (out[key] === undefined) {
            out[key] = NaN;
        }
    }
    return out;
}

class StudentView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            scores: [],
            plannedScores: [],
            future: false,
        };
    }

    static getDerivedStateFromProps(props) {
        const scores = {};
        if (props.success) {
            initialize(props.header, props.data);

            for (let i = 0; i !== props.header.length; ++i) {
                if (LOOKUP[props.header[i]]) {
                    scores[props.header[i]] = props.data[i];
                }
            }
        }

        const plannedScores = extend(scores);
        for (const elem of Object.values(LOOKUP)) {
            if (elem.default) {
                plannedScores[elem.name] = NaN;
            }
        }

        return { scores, plannedScores: extend(scores) };
    }

    handleFutureCheckboxChange = () => {
        this.setState(state => ({ future: !state.future, plannedScores: extend(state.scores) }));
    };

    handleFutureScoreChange = (name, newScore) => {
        this.state.plannedScores[name] = newScore === "" ? NaN : newScore;
        this.forceUpdate(); // sorry!
    };

    recursivelyMaximize = (topic, plannedScores) => {
        if (topic.isTopic) {
            for (const child of topic.children) {
                this.recursivelyMaximize(child, plannedScores);
            }
        } else if (topic.name !== "Final" && Number.isNaN(plannedScores[topic.name])) {
            plannedScores[topic.name] = topic.maxScore;
        }
    };

    refresh = () => {
        window.location.replace("./login");
    };

    handleSetCourseworkToMax = () => {
        this.recursivelyMaximize(ASSIGNMENTS[0], this.state.plannedScores);
        this.forceUpdate();
    };

    handleSetParticipationToMax = () => {
        for (const assignment of ASSIGNMENTS) {
            this.recursivelyMaximize(assignment, this.state.plannedScores);
        }
        this.forceUpdate();
    };

    computeTotals(curr, scores, totals) {
        if (totals[curr.name]) { // TODO: remove this kludge
            return totals[curr.name];
        }

        if (curr.future && !this.state.future) {
            return NaN;
        }

        // if (curr.default && this.state.future) {
        //     totals[curr.name] = NaN;
        //     return NaN;
        // }

        if (!curr.isTopic) {
            totals[curr.name] = (scores[curr.name] !== undefined)
                ? Number.parseFloat(scores[curr.name]) : NaN;
            return totals[curr.name];
        }

        const childTotals = [];

        let out = 0;
        for (const child of curr.children.slice().reverse()) {
            if (child.future && !this.state.future) {
                continue;
            }
            const childTotal = this.computeTotals(child, scores, totals);
            out += childTotal;
            childTotals.push(childTotal);
        }

        childTotals.reverse();

        if (curr.customCalculator) {
            out = curr.customCalculator(childTotals, this.state.future);
        }

        const limit = this.state.future ? curr.futureMaxScore : curr.maxScore;

        if (limit) {
            out = Math.min(out, limit);
        }

        totals[curr.name] = out;

        if (scores[curr.name] !== undefined
            && !Number.isNaN(Number.parseFloat(scores[curr.name]))) {
            totals[curr.name] = Number.parseFloat(scores[curr.name]);
            return totals[curr.name];
        }

        return out;
    }

    render() {
        const totals = {};
        const plannedTotals = {};

        const scores = extend(this.state.scores);

        if (this.state.future) {
            for (const elem of Object.values(LOOKUP)) {
                if (elem.default) {
                    totals[elem.name] = NaN;
                    scores[elem.name] = NaN;
                }
            }
        }


        for (const assignment of ASSIGNMENTS) {
            this.computeTotals(assignment, scores, totals);
            this.computeTotals(assignment, this.state.plannedScores, plannedTotals);
        }

        const warning = window.WARNING
            // eslint-disable-next-line react/no-danger
            && <div className="alert alert-danger" dangerouslySetInnerHTML={{ __html: window.WARNING }} />;

        return this.props.success
            ? (
                <>
                    {warning}
                    {window.ENABLE_PLANNING
                    && (
                        <FutureCheckBox
                            onChange={this.handleFutureCheckboxChange}
                            checked={this.state.future}
                        />
                    )
                    }
                    <br />
                    {this.state.future && (
                        <GradePlanner
                            data={plannedTotals}
                            onSetCourseworkToMax={this.handleSetCourseworkToMax}
                            onSetParticipationToMax={this.handleSetParticipationToMax}
                        />
                    )}
                    <GradeTable
                        schema={ASSIGNMENTS}
                        data={totals}
                        planned={this.state.plannedScores}
                        plannedTotals={plannedTotals}
                        future={this.state.future}
                        onFutureScoreChange={this.handleFutureScoreChange}
                    />
                </>
            )
            : <LoginButton onClick={this.refresh} />;
    }
}

export default StudentView;