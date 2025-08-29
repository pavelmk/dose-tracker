# Unit Test Of Dose Calculation

## Purpose

This FR is for a unit test to ensure that the dose calculation is accurate and that the decay curve is correct.

The formula for calculating the decay curve should be in a single function that's easily testable. Refactor the code if necessary to make it easier to test.

## Test Cases

### Test Case 1
For a 24hr half life drug, start with an arbitrary dose of any drug, then check that 24hrs later the calculated dose is half of the original dose. Repeat that for the next 24hrs out through 40 days.


