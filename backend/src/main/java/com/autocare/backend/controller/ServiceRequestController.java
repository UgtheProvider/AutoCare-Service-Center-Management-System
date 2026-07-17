package com.autocare.backend.controller;

import com.autocare.backend.dto.CustomerDashboardStats;
import com.autocare.backend.dto.DashboardStats;
import com.autocare.backend.entity.ServiceRequest;
import com.autocare.backend.entity.ServiceStatus;
import com.autocare.backend.service.ServiceRequestService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/service-requests")
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    public ServiceRequestController(ServiceRequestService serviceRequestService) {
        this.serviceRequestService = serviceRequestService;
    }

    // Customer creates a service request
    @PostMapping
    public ServiceRequest createRequest(@RequestBody ServiceRequest request) {
        return serviceRequestService.createRequest(request);
    }

    // Manager views all requests
    @GetMapping
    public List<ServiceRequest> getAllRequests() {
        return serviceRequestService.getAllRequests();
    }

    // Manager dashboard
    @GetMapping("/dashboard")
    public DashboardStats getDashboardStats() {
        return serviceRequestService.getDashboardStats();
    }

    // Customer dashboard
    @GetMapping("/customer/{customerId}/dashboard")
    public CustomerDashboardStats getCustomerDashboardStats(
            @PathVariable Long customerId) {

        return serviceRequestService.getCustomerDashboardStats(customerId);
    }

    // Manager views unassigned requests
    @GetMapping("/unassigned")
    public List<ServiceRequest> getUnassignedRequests() {
        return serviceRequestService.getUnassignedRequests();
    }

    // Employee views assigned requests
    @GetMapping("/employee/{employeeId}")
    public List<ServiceRequest> getRequestsByEmployee(
            @PathVariable Long employeeId) {

        return serviceRequestService.getRequestsByEmployee(employeeId);
    }

    // Employee views active requests
    @GetMapping("/employee/{employeeId}/active")
    public List<ServiceRequest> getActiveRequestsByEmployee(
            @PathVariable Long employeeId) {

        return serviceRequestService.getActiveRequestsByEmployee(employeeId);
    }

    // Customer views own requests
    @GetMapping("/customer/{customerId}")
    public List<ServiceRequest> getRequestsByCustomer(
            @PathVariable Long customerId) {

        return serviceRequestService.getRequestsByCustomer(customerId);
    }

    // Vehicle service history
    @GetMapping("/vehicle/{vehicleNumber}/history")
    public List<ServiceRequest> getVehicleServiceHistory(
            @PathVariable String vehicleNumber) {

        return serviceRequestService.getVehicleServiceHistory(vehicleNumber);
    }

    // Manager filters requests by status
    @GetMapping("/status/{status}")
    public List<ServiceRequest> getRequestsByStatus(
            @PathVariable ServiceStatus status) {

        return serviceRequestService.getRequestsByStatus(status);
    }

    // View request by ID
    @GetMapping("/id/{id}")
    public Optional<ServiceRequest> getRequestById(
            @PathVariable Long id) {

        return serviceRequestService.getRequestById(id);
    }

    // Manager assigns employee
    @PutMapping("/{requestId}/assign/{employeeId}")
    public ServiceRequest assignEmployee(
            @PathVariable Long requestId,
            @PathVariable Long employeeId) {

        return serviceRequestService.assignEmployee(requestId, employeeId);
    }

    // Employee updates service status
    @PutMapping("/{id}/status")
    public ServiceRequest updateStatus(
            @PathVariable Long id,
            @RequestParam ServiceStatus status) {

        return serviceRequestService.updateStatus(id, status);
    }

    // Delete request
    @DeleteMapping("/{id}")
    public void deleteRequest(@PathVariable Long id) {
        serviceRequestService.deleteRequest(id);
    }
}