/**
 * Stackvil Milestone Utilities
 * Official Shift: 10:00 AM – 07:00 PM IST
 * 3-Hour Milestones Schedule:
 * 1) 10:00 AM (Kickoff & Daily Plan)
 * 2) 01:00 PM (Midday 3-Hour Update: 10:00 AM – 01:00 PM)
 * 3) 04:00 PM (Afternoon 3-Hour Update: 01:00 PM – 04:00 PM)
 * 4) 07:00 PM (Evening Wrap-up & Day Deliverables: 04:00 PM – 07:00 PM)
 */

export const getNextWorksheetMilestone = () => {
    // Current IST Date/Time calculation
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utc + istOffset);

    const year = istNow.getFullYear();
    const month = istNow.getMonth();
    const date = istNow.getDate();

    // Target timestamps today in IST
    const slot10AM = new Date(year, month, date, 10, 0, 0);
    const slot1PM = new Date(year, month, date, 13, 0, 0);
    const slot4PM = new Date(year, month, date, 16, 0, 0);
    const slot7PM = new Date(year, month, date, 19, 0, 0);

    let nextTarget;
    let slotName;
    let slotTime;

    if (istNow < slot10AM) {
        nextTarget = slot10AM;
        slotName = "10:00 AM Kickoff Plan";
        slotTime = "10:00 AM";
    } else if (istNow < slot1PM) {
        nextTarget = slot1PM;
        slotName = "01:00 PM Milestone";
        slotTime = "01:00 PM";
    } else if (istNow < slot4PM) {
        nextTarget = slot4PM;
        slotName = "04:00 PM Milestone";
        slotTime = "04:00 PM";
    } else if (istNow < slot7PM) {
        nextTarget = slot7PM;
        slotName = "07:00 PM Day Wrap-up";
        slotTime = "07:00 PM";
    } else {
        // Past 7:00 PM IST -> Next is Tomorrow 10:00 AM
        const tomorrow10AM = new Date(year, month, date + 1, 10, 0, 0);
        nextTarget = tomorrow10AM;
        slotName = "Tomorrow 10:00 AM Kickoff";
        slotTime = "10:00 AM";
    }

    const diffMs = nextTarget.getTime() - istNow.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return {
        totalSeconds,
        formatted,
        slotName,
        slotTime,
        isShiftEnded: istNow >= slot7PM,
        isBeforeShift: istNow < slot10AM
    };
};
