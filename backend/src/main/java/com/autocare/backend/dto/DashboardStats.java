package com.autocare.backend.dto;

public class DashboardStats {

    private long totalRequests;
    private long created;
    private long received;
    private long inspection;
    private long inProgress;
    private long qualityCheck;
    private long readyForPickup;
    private long closed;
    private long unassigned;

    public DashboardStats() {
    }

    public long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(long totalRequests) {
        this.totalRequests = totalRequests;
    }

    public long getCreated() {
        return created;
    }

    public void setCreated(long created) {
        this.created = created;
    }

    public long getReceived() {
        return received;
    }

    public void setReceived(long received) {
        this.received = received;
    }

    public long getInspection() {
        return inspection;
    }

    public void setInspection(long inspection) {
        this.inspection = inspection;
    }

    public long getInProgress() {
        return inProgress;
    }

    public void setInProgress(long inProgress) {
        this.inProgress = inProgress;
    }

    public long getQualityCheck() {
        return qualityCheck;
    }

    public void setQualityCheck(long qualityCheck) {
        this.qualityCheck = qualityCheck;
    }

    public long getReadyForPickup() {
        return readyForPickup;
    }

    public void setReadyForPickup(long readyForPickup) {
        this.readyForPickup = readyForPickup;
    }

    public long getClosed() {
        return closed;
    }

    public void setClosed(long closed) {
        this.closed = closed;
    }

    public long getUnassigned() {
        return unassigned;
    }

    public void setUnassigned(long unassigned) {
        this.unassigned = unassigned;
    }
}